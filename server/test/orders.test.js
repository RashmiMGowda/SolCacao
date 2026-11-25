const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')

test('orders: creates guest and user orders, protects lookup, validates stock and lists history', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'solcacao-orders-test-'))
  process.env.AUTH_DATA_PATH = path.join(directory, 'users.json')
  process.env.ORDER_DATA_PATH = path.join(directory, 'orders.json')
  process.env.USE_MOCK_AUTH_REPOSITORY = 'true'
  process.env.NODE_ENV = 'test'
  process.env.BCRYPT_ROUNDS = '4'
  await fs.writeFile(process.env.AUTH_DATA_PATH, '[]')

  const { app } = require('../src/app')
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    await fs.rm(directory, { recursive: true, force: true })
  })

  const api = `http://127.0.0.1:${server.address().port}/api`
  const request = (route, body, token, method = body === undefined ? 'GET' : 'POST', headers = {}) => fetch(`${api}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const checkout = {
    email: 'guest@example.com',
    phone: '555-0101',
    paymentLastFour: '4242',
    shippingAddress: { firstName: 'Guest', lastName: 'Buyer', street: '1 Cocoa Way', city: 'Arlington', state: 'TX', postalCode: '76010', country: 'United States' },
    items: [{ productId: 'ecuador-citrus', quantity: 2 }],
  }

  assert.equal((await request('/orders', { ...checkout, items: [] })).status, 400)
  assert.equal((await request('/orders', { ...checkout, items: [{ productId: 'ecuador-75', quantity: 4 }] })).status, 409)

  const createdGuest = await request('/orders', checkout)
  assert.equal(createdGuest.status, 201)
  const guestResult = await createdGuest.json()
  assert.match(guestResult.order.id, /^SC-\d{8}-[0-9A-F]{8}$/)
  assert.equal(guestResult.order.itemCount, 2)
  assert.equal(guestResult.order.subtotalCents, 4400)
  assert.equal(guestResult.order.taxCents, 352)
  assert.ok(guestResult.guestToken)
  assert.equal((await request(`/orders/${guestResult.order.id}`)).status, 404)
  const guestLookup = await request(`/orders/${guestResult.order.id}`, undefined, null, 'GET', { 'x-guest-order-token': guestResult.guestToken })
  assert.equal(guestLookup.status, 200)

  const login = await request('/auth/login', { email: 'customer@solcacao.test', password: 'Password123!' })
  const { token } = await login.json()
  const userCreate = await request('/orders', { ...checkout, email: 'customer@solcacao.test', items: [{ productId: 'ghana-72', quantity: 1 }] }, token)
  assert.equal(userCreate.status, 201)
  const userOrder = (await userCreate.json()).order
  assert.equal((await request(`/orders/${userOrder.id}`, undefined, token)).status, 200)
  assert.equal((await request(`/orders/${guestResult.order.id}`, undefined, token)).status, 404)
  const history = await request('/orders', undefined, token)
  assert.equal(history.status, 200)
  const { orders } = await history.json()
  assert.equal(orders.length, 1)
  assert.equal(orders[0].id, userOrder.id)

  const stored = JSON.parse(await fs.readFile(process.env.ORDER_DATA_PATH, 'utf8'))
  assert.equal(stored.length, 2)
  assert.equal(stored[0].guestToken, undefined)
  assert.match(stored[0].guestTokenHash, /^[0-9a-f]{64}$/)
})
