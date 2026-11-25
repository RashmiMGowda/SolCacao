const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { rateLimit } = require('../src/middleware/rateLimit')
const validators = require('../src/modules/auth/authValidators')

test('auth rate limit isolates clients and expires attempts', () => {
  let time = 1000
  const limiter = rateLimit({ limit: 2, windowMs: 1000, now: () => time })
  let allowed = 0
  const response = { set: () => {}, status(code) { this.code = code; return this }, json() {} }
  const call = ip => limiter({ ip }, response, () => allowed++)
  call('one'); call('one'); call('one')
  assert.equal(allowed, 2)
  assert.equal(response.code, 429)
  call('two')
  assert.equal(allowed, 3)
  time = 2000; call('one')
  assert.equal(allowed, 4)
})
test('server validates phone digits, SQL field limits, language and bcrypt byte length', () => {
  const values = { accountType: 'RETAIL', firstName: 'A'.repeat(81), lastName: 'Test', email: 'test@example.com', phone: '-------', password: 'é'.repeat(40) + '123', confirmPassword: 'é'.repeat(40) + '123', preferredLanguage: 'invalid' }
  const { errors } = validators.validateRegister(values)
  for (const key of ['firstName', 'phone', 'password', 'preferredLanguage']) assert.ok(errors[key], key)
  assert.ok(validators.validateBusinessApproval({ approvalStatus: 'REJECTED', rejectionReason: 'a'.repeat(501) }).errors.rejectionReason)
})
test('production refuses missing or placeholder JWT secrets', () => {
  for (const secret of ['', 'replace-with-a-long-random-secret']) {
    const result = spawnSync(process.execPath, ['-e', "require('./src/config/env')"], { cwd: require('node:path').resolve(__dirname, '..'), env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: secret }, encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Production requires a private JWT_SECRET/)
  }
})
