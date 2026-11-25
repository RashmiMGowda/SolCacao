const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const jwt = require('jsonwebtoken')

test('auth: registration, JWT permissions, profile persistence and one-use password recovery', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'solcacao-auth-test-'))
  process.env.AUTH_DATA_PATH = path.join(directory, 'users.json')
  process.env.B2B_DATA_DIR = path.join(directory, 'b2b')
  process.env.USE_MOCK_AUTH_REPOSITORY = 'true'
  process.env.NODE_ENV = 'development'
  process.env.BCRYPT_ROUNDS = '4'
  await fs.writeFile(process.env.AUTH_DATA_PATH, '[]')
  // Exercise recovery without sending mail or using the project's SMTP credentials.
  require('../src/modules/auth/mailService').sendPasswordResetEmail = async () => ({ sent: false })
  const { app } = require('../src/app')
  const { env } = require('../src/config/env')
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    assert.ok(path.resolve(directory).startsWith(`${path.resolve(os.tmpdir())}${path.sep}solcacao-auth-test-`))
    await fs.rm(directory, { recursive: true, force: true })
  })
  const base = `http://127.0.0.1:${server.address().port}/api/auth`
  const call = (route, body, token, method = body === undefined ? 'GET' : 'POST') => fetch(`${base}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const values = { accountType: 'RETAIL', firstName: 'Test', lastName: 'Customer', email: 'auth-review@solcacao.test', phone: '555-0199', password: 'Password123!', confirmPassword: 'Password123!', role: 'ADMIN' }
  assert.equal((await call('/register', { ...values, password: 'weak' })).status, 400)
  const registration = await call('/register', values)
  assert.equal(registration.status, 201)
  const { token, user } = await registration.json()
  assert.equal(user.role, 'CUSTOMER')
  assert.equal(user.password, undefined)
  assert.equal(user.passwordHash, undefined)
  assert.equal((await call('/register', values)).status, 409)
  assert.equal((await call('/login', { email: values.email, password: 'wrong' })).status, 401)
  assert.equal((await call('/me')).status, 401)
  assert.equal((await call('/me', undefined, 'invalid')).status, 401)
  const expired = jwt.sign({ sub: user.id, role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: -1 })
  assert.equal((await call('/me', undefined, expired)).status, 401)
  assert.equal((await call('/admin/business-accounts', undefined, token)).status, 403)
  const update = await call('/me', { ...values, firstName: 'Updated', address: { street: '12 Main St', city: 'Arlington', state: 'TX', postalCode: '76010', country: 'United States' } }, token, 'PUT')
  assert.equal(update.status, 200)
  assert.equal((await (await call('/me', undefined, token)).json()).user.firstName, 'Updated')
  const recovery = await (await call('/forgot-password', { email: values.email })).json()
  assert.ok(recovery.resetToken)
  const unknown = await (await call('/forgot-password', { email: 'unknown@solcacao.test' })).json()
  assert.equal(unknown.message, recovery.message)
  assert.equal(unknown.resetToken, undefined)
  const reset = { token: recovery.resetToken, password: 'Changed123!', confirmPassword: 'Changed123!' }
  assert.equal((await call('/reset-password', { ...reset, confirmPassword: 'mismatch' })).status, 400)
  assert.equal((await call('/reset-password', reset)).status, 200)
  assert.equal((await call('/reset-password', reset)).status, 400)
  assert.equal((await call('/me', undefined, token)).status, 401)
  assert.equal((await call('/login', { email: values.email, password: values.password })).status, 401)
  assert.equal((await call('/login', { email: values.email, password: reset.password })).status, 200)
  const adminLogin = await (await call('/login', { email: 'admin@solcacao.test', password: 'Password123!' })).json()
  assert.equal((await call('/admin/business-accounts', undefined, adminLogin.token)).status, 200)
  const storedUsers = JSON.parse(await fs.readFile(process.env.AUTH_DATA_PATH, 'utf8'))
  const storedAdmin = storedUsers.find(item => item.id === adminLogin.user.id)
  storedAdmin.role = 'CUSTOMER'
  await fs.writeFile(process.env.AUTH_DATA_PATH, JSON.stringify(storedUsers))
  assert.equal((await call('/admin/business-accounts', undefined, adminLogin.token)).status, 403)
  storedAdmin.isActive = false
  await fs.writeFile(process.env.AUTH_DATA_PATH, JSON.stringify(storedUsers))
  assert.equal((await call('/me', undefined, adminLogin.token)).status, 401)
})
