const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { randomUUID } = require('node:crypto')

test('catalog and cart: filters products, persists guest carts and merges them after login', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'solcacao-catalog-cart-test-'))
  process.env.AUTH_DATA_PATH = path.join(directory, 'users.json')
  process.env.CART_DATA_PATH = path.join(directory, 'carts.json')
  process.env.USE_MOCK_AUTH_REPOSITORY = 'true'
  process.env.NODE_ENV = 'test'
  process.env.BCRYPT_ROUNDS = '4'
  await fs.writeFile(process.env.AUTH_DATA_PATH, '[]')

  const { app } = require('../src/app')
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    assert.ok(path.resolve(directory).startsWith(`${path.resolve(os.tmpdir())}${path.sep}solcacao-catalog-cart-test-`))
    await fs.rm(directory, { recursive: true, force: true })
  })

  const api = `http://127.0.0.1:${server.address().port}/api`
  const filteredResponse = await fetch(`${api}/products?locale=es&origin=Ecuador&cacaoPct=50-75&search=trufas&sort=price_desc&page=1&limit=2`)
  assert.equal(filteredResponse.status, 200)
  const filtered = await filteredResponse.json()
  assert.equal(filtered.pagination.total, 1)
  assert.equal(filtered.products[0].id, 'ecuador-citrus')
  assert.equal(filtered.products[0].name, 'Trufas Cítricas de Ecuador')
  assert.equal((await fetch(`${api}/products?cacaoPct=90-10`)).status, 400)
  assert.equal((await fetch(`${api}/products?sort=unsafe`)).status, 400)

  const guestSessionId = randomUUID()
  const json = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const guestPersist = await fetch(`${api}/cart/persist`, json({
    sessionId: guestSessionId,
    items: [{ productId: 'madagascar-55', quantity: 2 }, { productId: 'ecuador-75', quantity: 1 }],
  }))
  assert.equal(guestPersist.status, 200)
  const guestCart = (await guestPersist.json()).cart
  assert.equal(guestCart.itemCount, 3)
  assert.equal(guestCart.subtotalCents, 3750)
  assert.equal((await fetch(`${api}/cart?sessionId=${guestSessionId}`)).status, 200)
  assert.equal((await fetch(`${api}/cart/persist`, json({ sessionId: guestSessionId, items: [{ productId: 'ecuador-75', quantity: 4 }] }))).status, 409)

  const login = await fetch(`${api}/auth/login`, json({ email: 'customer@solcacao.test', password: 'Password123!' }))
  assert.equal(login.status, 200)
  const { token } = await login.json()
  const authenticatedJson = body => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const userPersist = await fetch(`${api}/cart/persist`, authenticatedJson({ items: [{ productId: 'madagascar-55', quantity: 1 }] }))
  assert.equal(userPersist.status, 200)
  const merge = await fetch(`${api}/cart/merge`, authenticatedJson({ guestSessionId }))
  assert.equal(merge.status, 200)
  const merged = await merge.json()
  assert.equal(merged.merged, true)
  assert.equal(merged.cart.itemCount, 4)
  assert.equal(merged.cart.items.find(item => item.productId === 'madagascar-55').quantity, 3)
  const mergedAgain = await fetch(`${api}/cart/merge`, authenticatedJson({ guestSessionId }))
  assert.equal((await mergedAgain.json()).merged, false)
})
