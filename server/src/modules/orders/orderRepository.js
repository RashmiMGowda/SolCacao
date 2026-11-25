const fs = require('node:fs/promises')
const path = require('node:path')
const { createHash, randomBytes, randomUUID } = require('node:crypto')
const { env } = require('../../config/env')
const { transaction } = require('../../db/mysql')
const { HttpError } = require('../../utils/httpError')

const catalog = require(path.resolve(__dirname, '../../../../db/seed/catalog.json'))
const useJson = env.useMockAuthRepository || !env.hasDatabaseConfig
const storePath = path.resolve(process.env.ORDER_DATA_PATH || path.join(__dirname, '../../../data/orders.json'))
let writeQueue = Promise.resolve()

const seedProducts = new Map(catalog.map(product => [product.id, {
  id: product.id,
  name: product.en.name,
  description: product.en.description,
  image: product.image,
  priceCents: Math.round(product.price * 100),
  stock: product.stock,
}]))

const hashToken = token => createHash('sha256').update(token).digest('hex')
const taxFor = subtotalCents => Math.round(subtotalCents * 0.08)
const orderNumber = () => `SC-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`

function serial(work) {
  const pending = writeQueue.then(work)
  writeQueue = pending.catch(() => {})
  return pending
}

async function readStore() {
  try { return JSON.parse(await fs.readFile(storePath, 'utf8'))
  } catch (error) { if (error.code === 'ENOENT') return []; throw error }
}

async function writeStore(orders) {
  await fs.mkdir(path.dirname(storePath), { recursive: true })
  const temporary = `${storePath}.${randomUUID()}.tmp`
  await fs.writeFile(temporary, JSON.stringify(orders, null, 2))
  await fs.rename(temporary, storePath)
}

function publicOrder(order) {
  if (!order) return null
  const items = order.items.map(item => ({
    productId: item.productId,
    name: item.name,
    image: item.image || null,
    quantity: Number(item.quantity),
    unitPriceCents: Number(item.unitPriceCents),
    unitPrice: Number(item.unitPriceCents) / 100,
    lineTotalCents: Number(item.unitPriceCents) * Number(item.quantity),
  }))
  return {
    id: order.orderNumber,
    orderNumber: order.orderNumber,
    userId: order.userId || null,
    createdAt: order.createdAt,
    email: order.email,
    phone: order.phone || '',
    shippingAddress: order.shippingAddress,
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotalCents: Number(order.subtotalCents),
    taxCents: Number(order.taxCents),
    totalCents: Number(order.totalCents),
    subtotal: Number(order.subtotalCents) / 100,
    tax: Number(order.taxCents) / 100,
    total: Number(order.totalCents) / 100,
    payment: { method: order.paymentMethod, lastFour: order.paymentLastFour, status: order.paymentStatus },
    status: order.status,
  }
}

function availableJsonStock(orders, productId) {
  const product = seedProducts.get(productId)
  const sold = orders.reduce((total, order) => total + order.items.filter(item => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0), 0)
  return Math.max(0, product.stock - sold)
}

async function createJson(userId, values) {
  return serial(async () => {
    const orders = await readStore()
    const items = values.items.map(item => {
      const product = seedProducts.get(item.productId)
      if (!product) throw new HttpError(400, `Unknown product: ${item.productId}.`, { productId: item.productId })
      const available = availableJsonStock(orders, item.productId)
      if (item.quantity > available) throw new HttpError(409, `${product.name} has only ${available} available.`, { productId: item.productId, available })
      return { productId: item.productId, name: product.name, description: product.description, image: product.image, quantity: item.quantity, unitPriceCents: product.priceCents }
    })
    const subtotalCents = items.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0)
    const taxCents = taxFor(subtotalCents)
    const guestToken = userId ? null : randomBytes(32).toString('hex')
    const order = {
      databaseId: randomUUID(),
      orderNumber: orderNumber(),
      userId: userId || null,
      guestTokenHash: guestToken ? hashToken(guestToken) : null,
      email: values.email,
      phone: values.phone,
      shippingAddress: values.shippingAddress,
      items,
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      paymentMethod: 'DEMO_CARD',
      paymentLastFour: values.paymentLastFour,
      paymentStatus: 'COMPLETED',
      status: 'PAID',
      createdAt: new Date().toISOString(),
    }
    orders.push(order)
    await writeStore(orders)
    return { order: publicOrder(order), guestToken }
  })
}

async function listJson(userId) {
  return (await readStore()).filter(order => order.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicOrder)
}

async function getJson(identifier, access) {
  const order = (await readStore()).find(item => item.orderNumber === identifier || item.databaseId === identifier)
  if (!order) return null
  if (order.userId) return access.userId === order.userId ? publicOrder(order) : null
  return access.guestToken && hashToken(access.guestToken) === order.guestTokenHash ? publicOrder(order) : null
}

async function loadMysqlOrder(connection, row) {
  if (!row) return null
  const [items] = await connection.execute(
    `SELECT oi.product_id AS productId, oi.product_name_snapshot AS name,
      oi.item_description_snapshot AS description, oi.quantity,
      oi.unit_price_cents AS unitPriceCents,
      (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = oi.product_id
       ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) AS image
     FROM order_items oi WHERE oi.order_id = ? ORDER BY oi.id`,
    [row.databaseId],
  )
  return publicOrder({
    ...row,
    items,
    shippingAddress: {
      firstName: row.firstName,
      lastName: row.lastName,
      street: row.street,
      city: row.city,
      state: row.state,
      postalCode: row.postalCode,
      country: row.country,
    },
  })
}

const mysqlOrderSelect = `
  SELECT o.id AS databaseId, o.order_number AS orderNumber, o.user_id AS userId,
    o.guest_token_hash AS guestTokenHash, o.checkout_email AS email,
    o.checkout_phone AS phone, o.status, o.subtotal_cents AS subtotalCents,
    o.tax_cents AS taxCents, o.total_cents AS totalCents, o.created_at AS createdAt,
    oa.first_name AS firstName, oa.last_name AS lastName, oa.street, oa.city,
    oa.state, oa.postal_code AS postalCode, oa.country,
    p.payment_method AS paymentMethod, p.payment_status AS paymentStatus,
    RIGHT(COALESCE(p.transaction_ref, ''), 4) AS paymentLastFour
  FROM orders o JOIN order_addresses oa ON oa.order_id = o.id
  JOIN payments p ON p.order_id = o.id`

async function createMysql(userId, values) {
  return transaction(async connection => {
    const ids = values.items.map(item => item.productId)
    const [products] = await connection.execute(
      `SELECT p.id, p.name, p.description, p.price_cents AS priceCents,
        GREATEST(i.on_hand - i.reserved, 0) AS available
       FROM products p JOIN inventory i ON i.product_id = p.id
       WHERE p.is_active = TRUE AND p.id IN (${ids.map(() => '?').join(',')}) FOR UPDATE`,
      ids,
    )
    const byId = new Map(products.map(product => [product.id, product]))
    const items = values.items.map(item => {
      const product = byId.get(item.productId)
      if (!product) throw new HttpError(400, `Unknown or inactive product: ${item.productId}.`, { productId: item.productId })
      const available = Number(product.available)
      if (item.quantity > available) throw new HttpError(409, `${product.name} has only ${available} available.`, { productId: item.productId, available })
      return { ...item, name: product.name, description: product.description, unitPriceCents: Number(product.priceCents) }
    })
    const subtotalCents = items.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0)
    const taxCents = taxFor(subtotalCents)
    const databaseId = randomUUID()
    const number = orderNumber()
    const guestToken = userId ? null : randomBytes(32).toString('hex')
    await connection.execute(
      `INSERT INTO orders (id, order_number, user_id, guest_token_hash, checkout_email,
       checkout_phone, status, subtotal_cents, tax_cents, total_cents)
       VALUES (?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?)`,
      [databaseId, number, userId || null, guestToken ? hashToken(guestToken) : null, values.email, values.phone || null, subtotalCents, taxCents, subtotalCents + taxCents],
    )
    const address = values.shippingAddress
    await connection.execute(
      `INSERT INTO order_addresses (id, order_id, first_name, last_name, street, city, state, postal_code, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), databaseId, address.firstName, address.lastName, address.street, address.city, address.state, address.postalCode, address.country],
    )
    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items (id, order_id, item_type, product_id, product_name_snapshot,
         item_description_snapshot, quantity, unit_price_cents)
         VALUES (?, ?, 'PRODUCT', ?, ?, ?, ?, ?)`,
        [randomUUID(), databaseId, item.productId, item.name, item.description, item.quantity, item.unitPriceCents],
      )
      await connection.execute('UPDATE inventory SET on_hand = on_hand - ? WHERE product_id = ?', [item.quantity, item.productId])
    }
    await connection.execute(
      `INSERT INTO payments (id, order_id, transaction_ref, amount_cents, payment_method, payment_status, paid_at)
       VALUES (?, ?, ?, ?, 'DEMO_CARD', 'COMPLETED', CURRENT_TIMESTAMP)`,
      [randomUUID(), databaseId, `DEMO-${randomUUID()}-${values.paymentLastFour}`, subtotalCents + taxCents],
    )
    await connection.execute(
      `INSERT INTO order_status_history (id, order_id, status, notes, changed_by)
       VALUES (?, ?, 'PAID', 'Demo checkout completed.', ?)`,
      [randomUUID(), databaseId, userId || null],
    )
    if (userId) {
      await connection.execute("DELETE ci FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = ? AND c.status = 'ACTIVE' AND ci.item_type = 'PRODUCT'", [userId])
      await connection.execute("UPDATE carts SET status = 'CONVERTED' WHERE user_id = ? AND status = 'ACTIVE'", [userId])
    } else if (values.sessionId) {
      await connection.execute("DELETE ci FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.session_id = ? AND c.status = 'ACTIVE' AND ci.item_type = 'PRODUCT'", [values.sessionId])
      await connection.execute("UPDATE carts SET status = 'CONVERTED' WHERE session_id = ? AND status = 'ACTIVE'", [values.sessionId])
    }
    const [rows] = await connection.execute(`${mysqlOrderSelect} WHERE o.id = ?`, [databaseId])
    return { order: await loadMysqlOrder(connection, rows[0]), guestToken }
  })
}

async function listMysql(userId) {
  return transaction(async connection => {
    const [rows] = await connection.execute(`${mysqlOrderSelect} WHERE o.user_id = ? ORDER BY o.created_at DESC`, [userId])
    return Promise.all(rows.map(row => loadMysqlOrder(connection, row)))
  })
}

async function getMysql(identifier, access) {
  return transaction(async connection => {
    const [rows] = await connection.execute(`${mysqlOrderSelect} WHERE o.id = ? OR o.order_number = ? LIMIT 1`, [identifier, identifier])
    const row = rows[0]
    if (!row) return null
    if (row.userId) return access.userId === row.userId ? loadMysqlOrder(connection, row) : null
    return access.guestToken && hashToken(access.guestToken) === row.guestTokenHash ? loadMysqlOrder(connection, row) : null
  })
}

module.exports = {
  create: (userId, values) => useJson ? createJson(userId, values) : createMysql(userId, values),
  list: userId => useJson ? listJson(userId) : listMysql(userId),
  getById: (identifier, access) => useJson ? getJson(identifier, access) : getMysql(identifier, access),
}
