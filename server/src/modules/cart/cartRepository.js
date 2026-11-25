const fs = require('node:fs/promises')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { env } = require('../../config/env')
const { transaction } = require('../../db/mysql')
const { HttpError } = require('../../utils/httpError')

const products = require(path.resolve(__dirname, '../../../../db/seed/catalog.json'))
const useJson = env.useMockAuthRepository || !env.hasDatabaseConfig
const storePath = path.resolve(process.env.CART_DATA_PATH || path.join(__dirname, '../../../data/carts.json'))
let writeQueue = Promise.resolve()

const inventory = new Map(products.map(product => [product.id, {
  productId: product.id,
  name: product.en.name,
  priceCents: Math.round(product.price * 100),
  stock: product.stock,
  image: product.image,
}]))

function serial(work) {
  const pending = writeQueue.then(work)
  writeQueue = pending.catch(() => {})
  return pending
}

async function readStore() {
  try { return JSON.parse(await fs.readFile(storePath, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}

async function writeStore(carts) {
  await fs.mkdir(path.dirname(storePath), { recursive: true })
  const temporary = `${storePath}.${randomUUID()}.tmp`
  await fs.writeFile(temporary, JSON.stringify(carts, null, 2))
  await fs.rename(temporary, storePath)
}

function cartResponse(cart) {
  const items = (cart?.items || []).map(item => {
    const product = inventory.get(item.productId)
    return { ...item, name: product?.name, image: product?.image, lineTotalCents: item.unitPriceCents * item.quantity }
  })
  return {
    id: cart?.id || null,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
    updatedAt: cart?.updatedAt || null,
  }
}

function ownerMatch(cart, owner) {
  return cart.status === 'ACTIVE' && (owner.userId ? cart.userId === owner.userId : cart.sessionId === owner.sessionId && !cart.userId)
}

function checkedJsonItems(items, options = {}) {
  const adjustments = []
  const checked = []
  for (const item of items) {
    const product = inventory.get(item.productId)
    if (!product) throw new HttpError(400, `Unknown product: ${item.productId}.`, { productId: item.productId })
    if (item.quantity > product.stock) {
      if (!options.clamp) throw new HttpError(409, `${product.name} has only ${product.stock} available.`, { productId: item.productId, available: product.stock })
      adjustments.push({ productId: item.productId, requested: item.quantity, saved: product.stock })
    }
    const quantity = Math.min(item.quantity, product.stock)
    if (quantity > 0) checked.push({ productId: item.productId, quantity, unitPriceCents: product.priceCents })
  }
  return { items: checked, adjustments }
}

async function getJson(owner) {
  const cart = (await readStore()).find(item => ownerMatch(item, owner))
  return cartResponse(cart)
}

async function persistJson(owner, requestedItems) {
  return serial(async () => {
    const carts = await readStore()
    let cart = carts.find(item => ownerMatch(item, owner))
    if (!cart) {
      cart = { id: randomUUID(), userId: owner.userId || null, sessionId: owner.sessionId || null, status: 'ACTIVE', createdAt: new Date().toISOString() }
      carts.push(cart)
    }
    cart.items = checkedJsonItems(requestedItems).items
    cart.updatedAt = new Date().toISOString()
    await writeStore(carts)
    return cartResponse(cart)
  })
}

async function mergeJson(userId, guestSessionId) {
  return serial(async () => {
    const carts = await readStore()
    const guest = carts.find(cart => cart.status === 'ACTIVE' && !cart.userId && cart.sessionId === guestSessionId)
    let user = carts.find(cart => cart.status === 'ACTIVE' && cart.userId === userId)
    if (!user) {
      user = { id: randomUUID(), userId, sessionId: null, status: 'ACTIVE', items: [], createdAt: new Date().toISOString() }
      carts.push(user)
    }
    const quantities = new Map((user.items || []).map(item => [item.productId, item.quantity]))
    for (const item of guest?.items || []) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity)
    const checked = checkedJsonItems([...quantities].map(([productId, quantity]) => ({ productId, quantity })), { clamp: true })
    user.items = checked.items
    user.updatedAt = new Date().toISOString()
    if (guest) {
      guest.status = 'ABANDONED'
      guest.updatedAt = user.updatedAt
    }
    await writeStore(carts)
    return { cart: cartResponse(user), adjustments: checked.adjustments, merged: Boolean(guest) }
  })
}

async function findCart(connection, owner, lock = false) {
  const clause = owner.userId ? 'user_id = ?' : 'user_id IS NULL AND session_id = ?'
  const value = owner.userId || owner.sessionId
  const [rows] = await connection.execute(
    `SELECT id, user_id, session_id, updated_at FROM carts WHERE ${clause} AND status = 'ACTIVE' ORDER BY updated_at DESC LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [value],
  )
  return rows[0] || null
}

async function createCart(connection, owner) {
  const cart = { id: randomUUID(), userId: owner.userId || null, sessionId: owner.sessionId || null }
  await connection.execute('INSERT INTO carts (id, user_id, session_id, status) VALUES (?, ?, ?, \'ACTIVE\')', [cart.id, cart.userId, cart.sessionId])
  return { id: cart.id, user_id: cart.userId, session_id: cart.sessionId, updated_at: new Date() }
}

async function loadMysqlCart(connection, cart) {
  if (!cart) return cartResponse(null)
  const [rows] = await connection.execute(
    `SELECT ci.product_id AS productId, ci.quantity, ci.unit_price_cents AS unitPriceCents,
      p.name, (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id
       ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) AS image
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ? AND ci.item_type = 'PRODUCT' ORDER BY p.name`,
    [cart.id],
  )
  const normalized = {
    id: cart.id,
    updatedAt: cart.updated_at,
    items: rows.map(row => ({
      productId: row.productId,
      quantity: Number(row.quantity),
      unitPriceCents: Number(row.unitPriceCents),
      name: row.name,
      image: row.image,
      lineTotalCents: Number(row.unitPriceCents) * Number(row.quantity),
    })),
  }
  return {
    ...normalized,
    itemCount: normalized.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents: normalized.items.reduce((sum, item) => sum + item.lineTotalCents, 0),
  }
}

async function mysqlInventory(connection, requestedItems, clamp = false) {
  if (!requestedItems.length) return { items: [], adjustments: [] }
  const ids = requestedItems.map(item => item.productId)
  const [rows] = await connection.execute(
    `SELECT p.id AS productId, p.name, p.price_cents AS priceCents,
      GREATEST(i.on_hand - i.reserved, 0) AS stock
     FROM products p JOIN inventory i ON i.product_id = p.id
     WHERE p.is_active = TRUE AND p.id IN (${ids.map(() => '?').join(',')}) FOR UPDATE`,
    ids,
  )
  const byId = new Map(rows.map(row => [row.productId, row]))
  const checked = []
  const adjustments = []
  for (const item of requestedItems) {
    const product = byId.get(item.productId)
    if (!product) throw new HttpError(400, `Unknown or inactive product: ${item.productId}.`, { productId: item.productId })
    const stock = Number(product.stock)
    if (item.quantity > stock) {
      if (!clamp) throw new HttpError(409, `${product.name} has only ${stock} available.`, { productId: item.productId, available: stock })
      adjustments.push({ productId: item.productId, requested: item.quantity, saved: stock })
    }
    const quantity = Math.min(item.quantity, stock)
    if (quantity > 0) checked.push({ productId: item.productId, quantity, unitPriceCents: Number(product.priceCents) })
  }
  return { items: checked, adjustments }
}

async function replaceMysqlItems(connection, cartId, items) {
  await connection.execute("DELETE FROM cart_items WHERE cart_id = ? AND item_type = 'PRODUCT'", [cartId])
  for (const item of items) {
    await connection.execute(
      "INSERT INTO cart_items (id, cart_id, item_type, product_id, quantity, unit_price_cents) VALUES (?, ?, 'PRODUCT', ?, ?, ?)",
      [randomUUID(), cartId, item.productId, item.quantity, item.unitPriceCents],
    )
  }
  await connection.execute('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [cartId])
}

async function getMysql(owner) {
  return transaction(async connection => loadMysqlCart(connection, await findCart(connection, owner)))
}

async function persistMysql(owner, requestedItems) {
  return transaction(async connection => {
    const cart = await findCart(connection, owner, true) || await createCart(connection, owner)
    const checked = await mysqlInventory(connection, requestedItems)
    await replaceMysqlItems(connection, cart.id, checked.items)
    return loadMysqlCart(connection, { ...cart, updated_at: new Date() })
  })
}

async function mergeMysql(userId, guestSessionId) {
  return transaction(async connection => {
    const owner = { userId }
    const user = await findCart(connection, owner, true) || await createCart(connection, owner)
    const guest = await findCart(connection, { sessionId: guestSessionId }, true)
    const userCart = await loadMysqlCart(connection, user)
    const guestCart = await loadMysqlCart(connection, guest)
    const quantities = new Map(userCart.items.map(item => [item.productId, item.quantity]))
    for (const item of guestCart.items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity)
    const checked = await mysqlInventory(connection, [...quantities].map(([productId, quantity]) => ({ productId, quantity })), true)
    await replaceMysqlItems(connection, user.id, checked.items)
    if (guest) await connection.execute("UPDATE carts SET status = 'ABANDONED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [guest.id])
    return { cart: await loadMysqlCart(connection, { ...user, updated_at: new Date() }), adjustments: checked.adjustments, merged: Boolean(guest) }
  })
}

module.exports = {
  get: owner => useJson ? getJson(owner) : getMysql(owner),
  persist: (owner, items) => useJson ? persistJson(owner, items) : persistMysql(owner, items),
  merge: (userId, sessionId) => useJson ? mergeJson(userId, sessionId) : mergeMysql(userId, sessionId),
}
