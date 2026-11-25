import { test } from 'vitest'
import assert from 'node:assert/strict'
import { validateRegistration, validateProfile } from './validators.js'

test('registration requires actual phone digits', () => {
  const values = { firstName: 'Alex', lastName: 'Test', email: 'a@b.test', phone: '-------', password: 'Password123!', confirmPassword: 'Password123!' }
  assert.ok(validateRegistration(values, 'RETAIL').phone)
  assert.equal(validateRegistration({ ...values, phone: '+1 (817) 555-0101' }, 'RETAIL').phone, undefined)
})

test('business profile enforces fields marked required', () => {
  const errors = validateProfile({ firstName: 'Alex', lastName: 'Test', email: 'a@b.test', companyName: 'Test', industry: ' ', businessPhone: '', phone: '' }, 'B2B')
  assert.ok(errors.industry)
  assert.ok(errors.businessPhone)
})
