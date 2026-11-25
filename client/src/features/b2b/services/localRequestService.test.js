import { test } from 'vitest'
import assert from 'node:assert/strict'
import { createLocalRequestService } from './localRequestService.js'

test('demo approval unlocks requests, preserves ownership and supports the full quote lifecycle', async () => {
  const storage = new Map()
  const business = { id: 'business-one', role: 'BUSINESS', accountType: 'B2B', isActive: true, corporatePartner: { id: 'partner-one', approvalStatus: 'PENDING' } }
  const admin = { id: 'admin', role: 'ADMIN', isActive: true }
  let session = business
  const dependencies = {
    getSession: async () => session,
    getStorage: () => ({ getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) }),
    listAccounts: async () => [business],
    approveAccount: async (_id, status) => { business.corporatePartner.approvalStatus = status; return business },
  }
  const service = createLocalRequestService(dependencies)
  await assert.rejects(service.list(), /approval/)
  session = admin
  await service.approve(business.id, 'APPROVED')
  session = business
  const values = { cacaoProfile: 'Peru 80%', quantityKg: 25, brandName: 'Test brand', designDetails: '', packagingOption: 'Luxury Gift Box', whiteLabel: 'company-branding', specialInstructions: '' }
  await assert.rejects(service.submit({ ...values, quantityKg: 5.5 }, 'invalid', []), /required/)
  const submitted = await service.submit(values, 'request-one', [{ name: 'design.svg', type: 'image/svg+xml', data: btoa('<svg/>') }])
  assert.equal(submitted.status, 'SUBMITTED')
  assert.equal(submitted.files[0].fileSizeBytes, 6)
  await service.submit(values, 'request-one', [])
  assert.equal((await service.list()).length, 1)
  await assert.rejects(service.change('request-one', 'review'), /approval/)
  session = { ...business, id: 'business-two' }
  assert.equal((await service.list()).length, 0)
  await assert.rejects(service.get('request-one'), /not found/)
  session = admin
  assert.equal((await service.change('request-one', 'review')).status, 'UNDER_REVIEW')
  const quote = { amountCents: 85000, validUntil: new Date(Date.now() + 86400000).toISOString(), notes: 'Test quote' }
  await assert.rejects(service.change('request-one', 'quote', { ...quote, amountCents: 0 }), /valid/)
  assert.equal((await service.change('request-one', 'quote', quote)).status, 'QUOTED')
  await assert.rejects(service.change('request-one', 'respond', { decision: 'ACCEPTED' }), /cannot/)
  session = business
  assert.equal((await service.change('request-one', 'respond', { decision: 'ACCEPTED' })).status, 'ACCEPTED')
  await assert.rejects(service.change('request-one', 'respond', { decision: 'DECLINED' }), /cannot/)
  const persisted = await createLocalRequestService(dependencies).get('request-one')
  assert.deepEqual(persisted.history.map((event) => event.status), ['SUBMITTED', 'UNDER_REVIEW', 'QUOTED', 'ACCEPTED'])
  business.corporatePartner.approvalStatus = 'REJECTED'
  await assert.rejects(service.get('request-one'), /approval/)
  session = { role: 'CUSTOMER', accountType: 'RETAIL', isActive: true }
  await assert.rejects(service.list(), /approval/)
  session = null
  await assert.rejects(service.list(), /Sign in/)
})
