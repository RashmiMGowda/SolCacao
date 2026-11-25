const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')

test('inquiries: validates and persists contact and feedback submissions', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'solcacao-inquiries-test-'))
  process.env.AUTH_DATA_PATH = path.join(directory, 'users.json')
  process.env.INQUIRY_DATA_PATH = path.join(directory, 'inquiries.json')
  process.env.USE_MOCK_AUTH_REPOSITORY = 'true'
  process.env.NODE_ENV = 'test'
  await fs.writeFile(process.env.AUTH_DATA_PATH, '[]')

  const { app } = require('../src/app')
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    assert.ok(path.resolve(directory).startsWith(`${path.resolve(os.tmpdir())}${path.sep}solcacao-inquiries-test-`))
    await fs.rm(directory, { recursive: true, force: true })
  })

  const base = `http://127.0.0.1:${server.address().port}/api/inquiries`
  const submit = body => fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const contact = { name: 'Rashmi Gowda', email: 'rashmi@example.com', category: 'SAMPLER', subject: 'Sampler question', message: 'Can I include dark chocolate and truffles?' }

  assert.equal((await submit({ ...contact, email: 'invalid' })).status, 400)
  assert.equal((await submit({ ...contact, category: 'INVALID' })).status, 400)
  assert.equal((await submit({ ...contact, message: 'x'.repeat(4001) })).status, 400)
  assert.equal((await submit({ ...contact, category: 'FEEDBACK', subject: '', rating: 6 })).status, 400)

  const response = await submit(contact)
  assert.equal(response.status, 201)
  const payload = await response.json()
  assert.match(payload.inquiry.reference, /^INQ-[A-F0-9]{8}$/)
  assert.equal(payload.inquiry.status, 'NEW')
  assert.equal(payload.notificationSent, false)

  const feedback = await submit({ name: 'Rashmi Gowda', email: 'rashmi@example.com', category: 'FEEDBACK', subject: '', message: 'The sampler steps were easy to use.', rating: '5' })
  assert.equal(feedback.status, 201)
  const stored = JSON.parse(await fs.readFile(process.env.INQUIRY_DATA_PATH, 'utf8'))
  assert.equal(stored.length, 2)
  assert.equal(stored[0].category, 'SAMPLER')
  assert.equal(stored[1].rating, 5)
})
