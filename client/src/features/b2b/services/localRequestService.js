import { schemas } from '../validation.js'

const STORAGE_KEY = 'solcacao.b2bRequests'

// The frontend demo uses the same request states and ownership rules as the API.
export function createLocalRequestService({ getSession, getStorage, listAccounts, approveAccount }) {
  const read = () => JSON.parse(getStorage().getItem(STORAGE_KEY) || '[]')
  const save = (requests) => getStorage().setItem(STORAGE_KEY, JSON.stringify(requests))
  const now = () => new Date().toISOString()

  async function account(adminOnly = false) {
    const user = await getSession()
    if (!user?.isActive) throw new Error('Sign in to continue.')
    if (user.role === 'ADMIN') return user
    if (adminOnly || user.role !== 'BUSINESS' || user.accountType !== 'B2B' || user.corporatePartner?.approvalStatus !== 'APPROVED') {
      throw new Error('Business account approval is required.')
    }
    return user
  }

  const owns = (user, item) => user.role === 'ADMIN' || item.userId === user.id
  function find(requests, id, user) {
    const item = requests.find((request) => request.id === id && owns(user, request))
    if (!item) throw new Error('Request not found.')
    return item
  }

  return {
    async submit(values, id, attachments) {
      const user = await account()
      if (user.role === 'ADMIN') throw new Error('Submit requests from a business account.')
      const fields = [['cacaoProfile', 'quantityKg'], ['brandName', 'designDetails'], ['packagingOption', 'whiteLabel', 'specialInstructions']]
      const validated = {}
      for (let index = 0; index < schemas.length; index++) {
        const result = schemas[index].validate(Object.fromEntries(fields[index].map((key) => [key, values[key]])))
        if (result.error) throw new Error('Complete all required fields.')
        Object.assign(validated, result.value)
      }
      if (!id || attachments.length > 5) throw new Error('Invalid request or attachments.')
      const files = attachments.map((file, index) => {
        if (!['application/pdf', 'image/svg+xml', 'image/png', 'image/jpeg'].includes(file.type) || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.data)) throw new Error('Invalid attachment.')
        return { id: `${id}-file-${index}`, originalFilename: file.name, mimeType: file.type, fileSizeBytes: atob(file.data).length, data: file.data }
      })
      if (files.reduce((sum, file) => sum + file.fileSizeBytes, 0) > 5 * 1024 * 1024) throw new Error('Attachments must be no larger than 5 MB in total.')
      const requests = read()
      const existing = requests.find((item) => item.id === id)
      if (existing) return find(requests, id, user)
      const request = { ...validated, id, userId: user.id, corporatePartnerId: user.corporatePartner.id, status: 'SUBMITTED', createdAt: now(), files, quote: null, history: [{ status: 'SUBMITTED', changedAt: now(), notes: 'Request submitted by business account.' }] }
      save([request, ...requests])
      return request
    },
    async list() {
      const user = await account()
      return read().filter((item) => owns(user, item))
    },
    async get(id) {
      return find(read(), id, await account())
    },
    async change(id, action, values = {}) {
      const user = await account(action !== 'respond')
      const requests = read()
      const item = find(requests, id, user)
      let notes
      if (action === 'review') {
        if (item.status !== 'SUBMITTED') throw new Error('This request is already under review or closed.')
        item.status = 'UNDER_REVIEW'
        notes = 'Request is being reviewed.'
      } else if (action === 'quote') {
        const expired = item.status === 'QUOTED' && Date.parse(item.quote?.validUntil) <= Date.now()
        if (!['SUBMITTED', 'UNDER_REVIEW'].includes(item.status) && !expired) throw new Error('A quote has already been issued or this request is closed.')
        if (!Number.isSafeInteger(values.amountCents) || values.amountCents < 1 || values.amountCents > 2147483647 || !Number.isFinite(Date.parse(values.validUntil)) || Date.parse(values.validUntil) <= Date.now() || (values.notes || '').length > 2000) throw new Error('Enter a valid amount and future expiry date.')
        item.quote = { id: `quote-${id}`, number: `SC-${id}`, amountCents: values.amountCents, validUntil: values.validUntil, notes: values.notes || '', status: 'SENT' }
        item.status = 'QUOTED'
        notes = `Quote ${item.quote.number} issued: USD ${(values.amountCents / 100).toFixed(2)}, valid until ${values.validUntil}.`
      } else if (action === 'respond') {
        if (user.role === 'ADMIN' || item.status !== 'QUOTED' || item.quote?.status !== 'SENT' || Date.parse(item.quote.validUntil) <= Date.now() || !['ACCEPTED', 'DECLINED'].includes(values.decision)) throw new Error('This quote cannot be answered.')
        item.status = values.decision
        item.quote.status = values.decision
        notes = 'Business account responded to quote.'
      } else throw new Error('Invalid request action.')
      item.history.push({ status: item.status, changedAt: now(), notes })
      save(requests)
      return item
    },
    async accounts() {
      await account(true)
      return listAccounts()
    },
    async approve(id, status, reason = '') {
      await account(true)
      if (!['APPROVED', 'REJECTED'].includes(status) || (status === 'REJECTED' && reason.trim().length < 8)) throw new Error('Choose approval or provide a rejection reason.')
      return approveAccount(id, status, reason)
    },
  }
}
