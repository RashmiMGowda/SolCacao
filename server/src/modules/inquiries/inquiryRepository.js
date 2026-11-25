const fs = require('fs/promises')
const path = require('path')
const { randomUUID } = require('crypto')
const { env } = require('../../config/env')
const { query } = require('../../db/mysql')

const useJson = env.useMockAuthRepository || !env.hasDatabaseConfig
const storePath = path.resolve(process.env.INQUIRY_DATA_PATH || path.join(__dirname, '../../../data/inquiries.json'))
let writeQueue = Promise.resolve()

function toPublicInquiry(item) {
  return {
    id: item.id,
    reference: `INQ-${item.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    status: item.status,
    createdAt: item.createdAt,
  }
}

async function readStore() {
  try {
    return JSON.parse(await fs.readFile(storePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

function serial(work) {
  const pending = writeQueue.then(work)
  writeQueue = pending.catch(() => {})
  return pending
}

async function create(values) {
  const storageCategory = values.category === 'FEEDBACK' ? 'FEEDBACK' : 'CONTACT'
  const item = {
    id: randomUUID(),
    ...values,
    storageCategory,
    status: 'NEW',
    createdAt: new Date().toISOString(),
  }

  if (!useJson) {
    await query(
      `INSERT INTO inquiries (id, name, email, category, subject, message, rating)
       VALUES (:id, :name, :email, :storageCategory, :subject, :message, :rating)`,
      item,
    )
    return item
  }

  return serial(async () => {
    const records = await readStore()
    await fs.mkdir(path.dirname(storePath), { recursive: true })
    const temporary = `${storePath}.${randomUUID()}.tmp`
    await fs.writeFile(temporary, JSON.stringify([...records, item], null, 2))
    await fs.rename(temporary, storePath)
    return item
  })
}

module.exports = { create, toPublicInquiry }
