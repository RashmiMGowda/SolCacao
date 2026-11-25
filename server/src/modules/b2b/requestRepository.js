const fs = require('fs/promises')
const path = require('path')
const { randomUUID } = require('crypto')
const { env } = require('../../config/env')
const { query, transaction } = require('../../db/mysql')
const { HttpError } = require('../../utils/httpError')

const dataDir = path.resolve(process.env.B2B_DATA_DIR || path.join(__dirname, '../../../data/b2b'))
const useJson = env.useMockAuthRepository || !env.hasDatabaseConfig
let writeQueue = Promise.resolve()
const serial = (work) => {
  const pending = writeQueue.then(work)
  writeQueue = pending.catch(() => {})
  return pending
}
const storePath = path.join(dataDir, 'requests.json')
async function readStore() {
  try { return JSON.parse(await fs.readFile(storePath, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}
function fromRow(row) {
  return {
    id: row.id, corporatePartnerId: row.corporate_partner_id,
    cacaoProfile: row.cacao_profile, quantityKg: row.quantity_kg,
    brandName: row.brand_campaign_name, designDetails: row.custom_mold_details || '',
    packagingOption: row.packaging_type, whiteLabel: row.white_label ? 'company-branding' : 'solcacao-cobranding',
    specialInstructions: row.special_instructions || '', status: row.status, createdAt: row.created_at,
  }
}
async function list(partnerId) {
  if (useJson) return (await readStore()).filter(item => !partnerId || item.corporatePartnerId === partnerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (!partnerId) return (await query('SELECT * FROM b2b_custom_requests ORDER BY created_at DESC, id DESC')).map(fromRow)
  const rows = await query('SELECT * FROM b2b_custom_requests WHERE corporate_partner_id = :partnerId ORDER BY created_at DESC, id DESC', { partnerId })
  return rows.map(fromRow)
}
async function find(id, partnerId) {
  if (useJson) return (await readStore()).find(item => item.id === id && (!partnerId || item.corporatePartnerId === partnerId)) || null
  const rows = await query(`SELECT * FROM b2b_custom_requests WHERE id = :id${partnerId ? ' AND corporate_partner_id = :partnerId' : ''}`, { id, partnerId: partnerId || null })
  if (!rows.length) return null
  const files = await query('SELECT * FROM b2b_request_files WHERE b2b_request_id = :id', { id })
  const history = await query('SELECT status, notes, changed_at FROM b2b_request_status_history WHERE b2b_request_id = :id ORDER BY changed_at', { id })
  const quotes = await query('SELECT * FROM b2b_quotes WHERE b2b_request_id = :id', { id })
  const quote = quotes[0] ? { id: quotes[0].id, number: quotes[0].quote_number, amountCents: quotes[0].quoted_amount_cents, validUntil: quotes[0].valid_until, notes: quotes[0].admin_notes || '', status: quotes[0].status } : null
  return { ...fromRow(rows[0]), quote, files: files.map(file => ({ id: file.id, originalFilename: file.original_filename, mimeType: file.mime_type, fileSizeBytes: Number(file.file_size_bytes), storagePath: file.storage_path })), history: history.map(item => ({ status: item.status, notes: item.notes, changedAt: item.changed_at })) }
}
async function create(values, attachments, user) {
  return serial(async () => {
    const partnerId = user.corporatePartner.id
    const previous = await find(values.id, partnerId)
    if (previous) return previous // A retry with the same identifier never creates another request.
    const now = new Date().toISOString()
    const files = attachments.map(attachment => ({ id: randomUUID(), originalFilename: attachment.originalFilename, mimeType: attachment.mimeType, fileSizeBytes: attachment.fileSizeBytes, storagePath: `${values.id}/${randomUUID()}` }))
    const item = { ...values, corporatePartnerId: partnerId, status: 'SUBMITTED', createdAt: now, files, history: [{ status: 'SUBMITTED', notes: 'Request submitted by business account.', changedAt: now }] }
    await fs.mkdir(dataDir, { recursive: true })
    try {
      if (attachments.length) {
        await fs.mkdir(path.join(dataDir, values.id), { recursive: true })
        for (let index = 0; index < files.length; index++) await fs.writeFile(path.join(dataDir, files[index].storagePath), attachments[index].buffer, { flag: 'wx' })
      }
      if (useJson) {
        const requests = await readStore()
        if (requests.some(request => request.id === values.id)) throw new HttpError(409, 'Request identifier already exists.')
        const temporary = `${storePath}.${randomUUID()}.tmp`
        await fs.writeFile(temporary, JSON.stringify([...requests, item], null, 2))
        await fs.rename(temporary, storePath)
      } else {
        await transaction(async connection => {
          await connection.execute(`INSERT INTO b2b_custom_requests (id, corporate_partner_id, cacao_profile, quantity_kg, brand_campaign_name, custom_mold_details, packaging_type, white_label, special_instructions) VALUES (:id, :partnerId, :cacaoProfile, :quantityKg, :brandName, :designDetails, :packagingOption, :whiteLabel, :specialInstructions)`, { ...values, partnerId, whiteLabel: values.whiteLabel === 'company-branding' })
          for (const file of files) await connection.execute(`INSERT INTO b2b_request_files (id, b2b_request_id, original_filename, storage_path, mime_type, file_size_bytes) VALUES (:id, :requestId, :originalFilename, :storagePath, :mimeType, :fileSizeBytes)`, { ...file, requestId: values.id })
          await connection.execute(`INSERT INTO b2b_request_status_history (id, b2b_request_id, status, notes, changed_by) VALUES (:id, :requestId, 'SUBMITTED', :notes, :userId)`, { id: randomUUID(), requestId: values.id, notes: item.history[0].notes, userId: user.id })
        })
      }
    } catch (error) {
      for (const file of files) await fs.unlink(path.join(dataDir, file.storagePath)).catch(() => {})
      if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Request identifier already exists. Refresh your requests before retrying.')
      throw error
    }
    return item
  })
}
function attachmentPath(file) {
  const resolved = path.resolve(dataDir, file.storagePath)
  if (!resolved.startsWith(`${dataDir}${path.sep}`)) throw new HttpError(404, 'Attachment not found.')
  return resolved
}
function publicRequest(item) {
  return { ...item, files: (item.files || []).map(({ storagePath: _privatePath, ...file }) => file) }
}
async function transition(id, partnerId, action, userId) {
  return serial(async () => {
    const apply = item => {
      if (!item) throw new HttpError(404, 'Request not found.')
      if (action.type === 'review') {
        if (!['SUBMITTED', 'UNDER_REVIEW'].includes(item.status)) throw new HttpError(409, 'This request cannot be moved to review.')
        item.status = 'UNDER_REVIEW'
      } else if (action.type === 'quote') {
        const expired = item.status === 'QUOTED' && new Date(item.quote?.validUntil).getTime() <= Date.now()
        if (!['SUBMITTED', 'UNDER_REVIEW'].includes(item.status) && !expired) throw new HttpError(409, 'A quote has already been issued or this request is closed.')
        item.quote = { id: randomUUID(), number: `SC-${randomUUID()}`, amountCents: action.amountCents, validUntil: action.validUntil, notes: action.notes, status: 'SENT' }
        item.status = 'QUOTED'
      } else {
        if (item.status !== 'QUOTED' || item.quote?.status !== 'SENT') throw new HttpError(409, 'This quote has already been answered or is unavailable.')
        if (new Date(item.quote.validUntil).getTime() < Date.now()) throw new HttpError(409, 'This quote has expired. Contact SolCacao for an updated quote.')
        item.status = action.decision
        item.quote.status = action.decision
      }
      item.history ||= []
      item.history.push({ status: item.status, notes: action.type === 'quote' ? `Quote ${item.quote.number} issued: USD ${(action.amountCents / 100).toFixed(2)}, valid until ${action.validUntil}.` : action.type === 'review' ? 'Request is being reviewed.' : 'Business account responded to quote.', changedAt: new Date().toISOString() })
      return item
    }
    if (useJson) {
      const requests = await readStore()
      const item = apply(requests.find(value => value.id === id && (!partnerId || value.corporatePartnerId === partnerId)))
      const temporary = `${storePath}.${randomUUID()}.tmp`
      await fs.writeFile(temporary, JSON.stringify(requests, null, 2))
      await fs.rename(temporary, storePath)
      return item
    }
    await transaction(async connection => {
      const [rows] = await connection.execute('SELECT * FROM b2b_custom_requests WHERE id = :id FOR UPDATE', { id })
      if (!rows.length || (partnerId && rows[0].corporate_partner_id !== partnerId)) throw new HttpError(404, 'Request not found.')
      const [quotes] = await connection.execute('SELECT * FROM b2b_quotes WHERE b2b_request_id = :id FOR UPDATE', { id })
      const item = apply({ ...fromRow(rows[0]), quote: quotes[0] ? { status: quotes[0].status, validUntil: quotes[0].valid_until } : null })
      if (action.type === 'quote') await connection.execute(`INSERT INTO b2b_quotes (id, b2b_request_id, quote_number, quoted_amount_cents, valid_until, admin_notes, created_by, status) VALUES (:quoteId, :id, :number, :amountCents, :validUntil, :notes, :userId, 'SENT') ON DUPLICATE KEY UPDATE quote_number = VALUES(quote_number), quoted_amount_cents = VALUES(quoted_amount_cents), valid_until = VALUES(valid_until), admin_notes = VALUES(admin_notes), created_by = VALUES(created_by), status = 'SENT'`, { id, userId, quoteId: item.quote.id, number: item.quote.number, amountCents: action.amountCents, validUntil: new Date(action.validUntil), notes: action.notes })
      if (action.type === 'respond') await connection.execute('UPDATE b2b_quotes SET status = :status WHERE b2b_request_id = :id', { id, status: item.status })
      await connection.execute('UPDATE b2b_custom_requests SET status = :status WHERE id = :id', { id, status: item.status })
      await connection.execute('INSERT INTO b2b_request_status_history (id, b2b_request_id, status, notes, changed_by) VALUES (:historyId, :id, :status, :notes, :userId)', { historyId: randomUUID(), id, status: item.status, notes: item.history[0].notes, userId })
    })
    return find(id, partnerId)
  })
}
module.exports = { list, find, create, transition, attachmentPath, publicRequest }
