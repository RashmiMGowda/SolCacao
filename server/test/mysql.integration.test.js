const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const path = require('node:path')
const mysql = require('mysql2/promise')

test('MySQL: partial-schema migration, repeatable seeds, authentication, approval and atomic reset', { skip: process.env.MYSQL_INTEGRATION !== 'true' }, async t => {
  require('dotenv').config()
  const database = `solcacao_test_${randomUUID().replaceAll('-', '')}`
  process.env.DB_NAME = database
  process.env.USE_MOCK_AUTH_REPOSITORY = 'false'
  process.env.NODE_ENV = 'development'
  process.env.JWT_SECRET = randomUUID() + randomUUID()
  process.env.BCRYPT_ROUNDS = '4'
  const fsPromises = require('node:fs/promises')
  const os = require('node:os')
  const b2bDirectory = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'solcacao-b2b-mysql-'))
  process.env.B2B_DATA_DIR = b2bDirectory
  const { env } = require('../src/config/env')
  const connection = await mysql.createConnection({ ...env.db, database: undefined })
  let server
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
    await require('../src/db/mysql').getPool()?.end()
    assert.match(database, /^solcacao_test_[a-f0-9]{32}$/)
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await connection.end()
    assert.ok(path.resolve(b2bDirectory).startsWith(`${path.resolve(os.tmpdir())}${path.sep}solcacao-b2b-mysql-`))
    await fsPromises.rm(b2bDirectory, { recursive: true, force: true })
  })
  // Simulate a teammate's partly initialized schema, not just a fresh import.
  await connection.query(`CREATE DATABASE \`${database}\``)
  await connection.query(`USE \`${database}\``)
  const fs = require('node:fs')
  const schema = fs.readFileSync(path.resolve(__dirname, '../../db/schema/solcacao_schema.sql'), 'utf8')
  await connection.query(schema.match(/CREATE TABLE users \([\s\S]*?\) ENGINE=InnoDB;/)[0])
  const run = file => execFileSync(process.execPath, [path.resolve(__dirname, '../../db', file)], { cwd: path.resolve(__dirname, '..'), env: process.env, stdio: 'pipe' })
  run('migrate.js'); run('migrate.js'); run('seedAuth.js'); run('seedCatalog.js'); run('seedWorkflows.js'); run('seedWorkflows.js')
  const [[before]] = await connection.query('SELECT COUNT(*) AS n FROM users')
  await connection.query("UPDATE users SET first_name = 'Preserved' WHERE email = 'customer@solcacao.test'")
  run('seedAuth.js'); run('seedCatalog.js'); run('check.js')
  const [[after]] = await connection.query('SELECT COUNT(*) AS n FROM users')
  assert.equal(before.n, after.n)
  const [[preserved]] = await connection.query("SELECT first_name FROM users WHERE email = 'customer@solcacao.test'")
  assert.equal(preserved.first_name, 'Preserved')
  const [[translationCounts]] = await connection.query('SELECT (SELECT COUNT(*) FROM translation_keys) AS keys_count, (SELECT COUNT(*) FROM translation_values) AS values_count')
  assert.equal(translationCounts.keys_count, require('../../db/seed/localization.json').length)
  assert.equal(translationCounts.values_count, translationCounts.keys_count * 2)
  await assert.rejects(connection.query("UPDATE inventory SET on_hand = -1 WHERE product_id = 'madagascar-55'"), error => error.code === 'ER_CHECK_CONSTRAINT_VIOLATED')
  await assert.rejects(connection.query("INSERT INTO addresses (id, user_id, label, street, city, state, postal_code, country) VALUES ('invalid-owner', 'nonexistent-user', 'Home', 'Street', 'City', 'TX', '76010', 'US')"), error => error.code === 'ER_NO_REFERENCED_ROW_2')
  require('../src/modules/auth/mailService').sendPasswordResetEmail = async () => ({ sent: false })
  const { app } = require('../src/app')
  server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  let base = `http://127.0.0.1:${server.address().port}/api/auth`
  const call = (route, body, token, method = body === undefined ? 'GET' : 'POST') => fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const login = async email => {
    const response = await call('/login', { email, password: 'Password123!' })
    assert.equal(response.status, 200)
    return response.json()
  }
  const admin = await login('admin@solcacao.test')
  const customer = await login('customer@solcacao.test')
  assert.equal((await call('/admin/business-accounts', undefined, customer.token)).status, 403)
  assert.equal((await call('/me', undefined, admin.token)).status, 200)
  const values = { firstName: 'Test', lastName: 'Business', email: 'mysql-business@solcacao.test', phone: '6825550101', password: 'Password123!', confirmPassword: 'Password123!', accountType: 'B2B', companyName: 'MySQL Test Company', industry: 'Hospitality', businessPhone: '6825550101' }
  const registration = await call('/register', values)
  assert.equal(registration.status, 201)
  const business = await registration.json()
  assert.equal(business.user.corporatePartner.approvalStatus, 'PENDING')
  assert.equal((await call('/business-approved-only', undefined, business.token)).status, 403)
  const approvalPath = `/admin/business-accounts/${business.user.id}/approval`
  assert.equal((await call(approvalPath, { approvalStatus: 'REJECTED', rejectionReason: 'Missing company details.' }, admin.token, 'PATCH')).status, 200)
  const updated = await call('/me', { ...values, corporatePartner: { companyName: 'Updated Company', industry: 'Hospitality', businessPhone: '6825550101' } }, business.token, 'PUT')
  assert.equal(updated.status, 200)
  const updatedUser = (await updated.json()).user
  assert.equal(updatedUser.corporatePartner.approvalStatus, 'PENDING')
  assert.ok(!updatedUser.corporatePartner.rejectionReason)
  assert.equal((await call(approvalPath, { approvalStatus: 'APPROVED' }, admin.token, 'PATCH')).status, 200)
  assert.equal((await call('/business-approved-only', undefined, business.token)).status, 200)
  await t.test('B2B API writes MySQL rows and files, isolates owners and retrieves after reconnect', async () => {
    const b2bCall = (route, token, body) => fetch(`http://127.0.0.1:${server.address().port}/api/b2b${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const fileBytes = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(5 * 1024 * 1024 - 5)])
    const payload = { requestId: randomUUID(), cacaoProfile: 'Peru 80%', quantityKg: 25, brandName: 'MySQL B2B integration', designDetails: 'Custom mold', packagingOption: 'Event Sleeve', whiteLabel: 'company-branding', specialInstructions: 'Test only', attachments: [{ name: 'design.pdf', type: 'application/pdf', data: fileBytes.toString('base64') }] }
    assert.equal((await b2bCall('/requests', undefined, payload)).status, 401)
    assert.equal((await b2bCall('/requests', customer.token, payload)).status, 403)
    assert.equal((await b2bCall('/requests', business.token, { ...payload, quantityKg: 4 })).status, 400)
    const submitted = await b2bCall('/requests', business.token, payload)
    assert.equal(submitted.status, 201, await submitted.clone().text())
    const saved = (await submitted.json()).request
    assert.equal(saved.files[0].fileSizeBytes, fileBytes.length)
    assert.equal(saved.files[0].storagePath, undefined)
    const [[row]] = await connection.execute('SELECT * FROM b2b_custom_requests WHERE id = ?', [saved.id])
    assert.equal(row.brand_campaign_name, payload.brandName)
    assert.equal(row.quantity_kg, 25)
    assert.equal(row.white_label, 1)
    assert.equal(row.corporate_partner_id, business.user.corporatePartner.id)
    const [[fileRow]] = await connection.execute('SELECT * FROM b2b_request_files WHERE b2b_request_id = ?', [saved.id])
    assert.equal(Number(fileRow.file_size_bytes), fileBytes.length)
    assert.deepEqual(await fsPromises.readFile(path.join(b2bDirectory, fileRow.storage_path)), fileBytes)
    const retries = await Promise.all([b2bCall('/requests', business.token, payload), b2bCall('/requests', business.token, payload)])
    assert.ok(retries.every(response => response.status === 201))
    const [[count]] = await connection.execute('SELECT COUNT(*) AS n FROM b2b_custom_requests WHERE id = ?', [saved.id])
    assert.equal(count.n, 1)
    const other = await login('business@solcacao.test')
    assert.equal((await b2bCall(`/requests/${saved.id}`, other.token)).status, 404)
    assert.equal((await b2bCall(`/requests/${saved.id}/files/${saved.files[0].id}`, other.token)).status, 404)
    assert.ok(!(await (await b2bCall('/requests', other.token)).json()).requests.some(item => item.id === saved.id))
    assert.equal((await b2bCall(`/requests/${saved.id}/review`, admin.token, {})).status, 200)
    const quote = { amountCents: 85000, validUntil: new Date(Date.now() + 86400000).toISOString(), notes: 'Test quote' }
    assert.equal((await b2bCall(`/requests/${saved.id}/quote`, admin.token, quote)).status, 200)
    assert.equal((await b2bCall(`/requests/${saved.id}/quote`, admin.token, quote)).status, 409)
    assert.equal((await b2bCall(`/requests/${saved.id}/respond`, business.token, { decision: 'ACCEPTED' })).status, 200)
    const [[quotes]] = await connection.execute('SELECT COUNT(*) AS n FROM b2b_quotes WHERE b2b_request_id = ?', [saved.id])
    assert.equal(quotes.n, 1)
    await new Promise(resolve => server.close(resolve))
    server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    base = `http://127.0.0.1:${server.address().port}/api/auth`
    const persisted = (await (await b2bCall(`/requests/${saved.id}`, business.token)).json()).request
    assert.equal(persisted.status, 'ACCEPTED')
    assert.deepEqual(persisted.history.map(event => event.status).sort(), ['SUBMITTED', 'UNDER_REVIEW', 'QUOTED', 'ACCEPTED'].sort())
    assert.ok((await (await b2bCall('/requests', business.token)).json()).requests.some(item => item.id === saved.id))
    const download = await b2bCall(`/requests/${saved.id}/files/${saved.files[0].id}`, business.token)
    assert.equal(download.status, 200)
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), fileBytes)
  })
  const recovery = await (await call('/forgot-password', { email: values.email })).json()
  assert.ok(recovery.resetToken)
  const reset = { token: recovery.resetToken, password: 'Changed123!', confirmPassword: 'Changed123!' }
  const responses = await Promise.all([call('/reset-password', reset), call('/reset-password', reset)])
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 400])
  assert.equal((await call('/me', undefined, business.token)).status, 401)
  assert.equal((await call('/login', { email: values.email, password: reset.password })).status, 200)
  assert.equal((await call('/login', { email: values.email, password: values.password })).status, 401)
})
