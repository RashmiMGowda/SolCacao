const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { validateRequest, MAX_FILE_BYTES } = require('../src/modules/b2b/requestValidators')

const values = { requestId: randomUUID(), cacaoProfile: 'Peru 80%', quantityKg: 25, brandName: 'Upload test', packagingOption: 'Event Sleeve', whiteLabel: 'company-branding' }
const pdf = bytes => ({ name: 'design.pdf', type: 'application/pdf', data: Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(bytes - 5)]).toString('base64') })
test('B2B accepts a valid 5 MB upload without overflowing the validator stack', () => {
  assert.equal(validateRequest({ ...values, attachments: [pdf(MAX_FILE_BYTES)] }).attachments[0].fileSizeBytes, MAX_FILE_BYTES)
})
test('B2B rejects malformed base64, oversized files and excessive combined uploads', () => {
  for (const data of ['YQ=A', 'YQ===', 'YR==', 'YQ', 'Y Q==']) {
    assert.throws(() => validateRequest({ ...values, attachment: { ...pdf(10), data } }), error => error.status === 400)
  }
  assert.throws(() => validateRequest({ ...values, attachments: [pdf(MAX_FILE_BYTES + 1)] }), error => error.status === 400)
  assert.throws(() => validateRequest({ ...values, attachments: [pdf(MAX_FILE_BYTES), pdf(10)] }), error => error.status === 400)
})
