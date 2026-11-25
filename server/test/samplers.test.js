const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { randomUUID } = require('node:crypto')

test('samplers: validates, prices, persists and lists configurations by browser session', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'solcacao-samplers-test-'))
  process.env.SAMPLER_DATA_PATH = path.join(directory, 'samplers.json')
  process.env.USE_MOCK_AUTH_REPOSITORY = 'true'
  process.env.NODE_ENV = 'test'
  const { app } = require('../src/app')
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    assert.ok(path.resolve(directory).startsWith(`${path.resolve(os.tmpdir())}${path.sep}solcacao-samplers-test-`))
    await fs.rm(directory, { recursive: true, force: true })
  })

  const base = `http://127.0.0.1:${server.address().port}/api/samplers`
  const sessionId = randomUUID()
  const create = body => fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', Connection: 'close' }, body: JSON.stringify(body) })
  const values = {
    sessionId,
    boxSize: 12,
    packaging: 'Luxury Gift Box',
    selections: [{ name: '70% Dark Cacao', quantity: 8 }, { name: 'Milk Chocolate', quantity: 4 }],
    giftMessage: 'Enjoy!',
  }

  assert.equal((await create({ ...values, boxSize: 10 })).status, 400)
  assert.equal((await create({ ...values, selections: [{ name: 'Unknown chocolate', quantity: 12 }] })).status, 400)
  assert.equal((await create({ ...values, giftMessage: 'x'.repeat(501) })).status, 400)

  const response = await create(values)
  assert.equal(response.status, 201)
  const { sampler } = await response.json()
  assert.equal(sampler.boxSize, 12)
  assert.equal(sampler.basePriceCents, 3000)
  assert.equal(sampler.packagingFeeCents, 500)
  assert.equal(sampler.totalPriceCents, 3500)
  assert.deepEqual(sampler.selections, values.selections)

  const listed = await fetch(`${base}?sessionId=${sessionId}`, { headers: { Connection: 'close' } })
  const { samplers } = await listed.json()
  assert.equal(samplers.length, 1)
  assert.equal(samplers[0].id, sampler.id)
  assert.deepEqual(JSON.parse(await fs.readFile(process.env.SAMPLER_DATA_PATH, 'utf8')).map(item => item.id), [sampler.id])
})
