const fs = require('fs/promises')
const path = require('path')
const { randomUUID } = require('crypto')
const { env } = require('../../config/env')
const { query } = require('../../db/mysql')

const useJson = env.useMockAuthRepository || !env.hasDatabaseConfig
const storePath = path.resolve(process.env.SAMPLER_DATA_PATH || path.join(__dirname, '../../../data/samplers.json'))
let writeQueue = Promise.resolve()

const publicSampler = (item) => ({
  id: item.id,
  boxSize: Number(item.box_size ?? item.boxSize),
  packaging: item.packaging_type ?? item.packaging,
  selections: typeof item.selections === 'string' ? JSON.parse(item.selections) : item.selections,
  giftMessage: item.gift_message ?? item.giftMessage ?? '',
  basePriceCents: Number(item.base_price_cents ?? item.basePriceCents),
  packagingFeeCents: Number(item.packaging_fee_cents ?? item.packagingFeeCents),
  totalPriceCents: Number(item.total_price_cents ?? item.totalPriceCents),
  createdAt: item.created_at ?? item.createdAt,
})

async function readStore() {
  try { return JSON.parse(await fs.readFile(storePath, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}

function serial(work) {
  const pending = writeQueue.then(work)
  writeQueue = pending.catch(() => {})
  return pending
}

async function create(sessionId, values, prices) {
  const id = randomUUID()
  const record = {
    id,
    session_id: sessionId,
    box_size: values.boxSize,
    packaging_type: values.packaging,
    selections: values.selections,
    gift_message: values.giftMessage || null,
    base_price_cents: prices.base,
    packaging_fee_cents: prices.fee,
    total_price_cents: prices.base + prices.fee,
  }
  if (!useJson) {
    await query(
      `INSERT INTO custom_samplers
       (id, session_id, box_size, packaging_type, selections, gift_message, base_price_cents, packaging_fee_cents, total_price_cents)
       VALUES (:id, :session_id, :box_size, :packaging_type, :selections, :gift_message, :base_price_cents, :packaging_fee_cents, :total_price_cents)`,
      { ...record, selections: JSON.stringify(record.selections) },
    )
    return publicSampler({ ...record, created_at: new Date().toISOString() })
  }
  return serial(async () => {
    const records = await readStore()
    const saved = { ...record, created_at: new Date().toISOString() }
    await fs.mkdir(path.dirname(storePath), { recursive: true })
    const temporary = `${storePath}.${randomUUID()}.tmp`
    await fs.writeFile(temporary, JSON.stringify([...records, saved], null, 2))
    await fs.rename(temporary, storePath)
    return publicSampler(saved)
  })
}

async function list(sessionId) {
  if (!useJson) {
    const rows = await query(
      `SELECT id, box_size, packaging_type, selections, gift_message, base_price_cents,
       packaging_fee_cents, total_price_cents, created_at FROM custom_samplers
       WHERE session_id = :sessionId ORDER BY created_at DESC`,
      { sessionId },
    )
    return rows.map(publicSampler)
  }
  return (await readStore()).filter(item => item.session_id === sessionId).reverse().map(publicSampler)
}

module.exports = { create, list }
