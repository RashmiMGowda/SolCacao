import { test } from 'vitest'
import assert from 'node:assert/strict'
import { validateContact } from './contactValidation.js'

const valid = { name: 'Test Customer', email: 'test@example.com', category: 'GENERAL', subject: 'Gift question', message: 'Please send gift details.', rating: '' }

test('contact enforces text length limits', () => {
  assert.equal(validateContact({ ...valid, message: 'x'.repeat(4001) }).message, 'tooLong')
  assert.equal(validateContact({ ...valid, subject: 'x'.repeat(181) }).subject, 'tooLong')
  assert.deepEqual(validateContact({ ...valid, message: 'x'.repeat(4000) }), {})
})

test('contact rejects empty and whitespace-only required values', () => {
  assert.deepEqual(validateContact({ ...valid, name: '   ', email: ' ', subject: '\t', message: '\n' }), { name: 'required', email: 'required', message: 'required', subject: 'required' })
})
test('contact validates email and feedback rating while allowing surrounding whitespace', () => {
  assert.deepEqual(validateContact({ ...valid, email: ' test@example.com ' }), {})
  assert.equal(validateContact({ ...valid, email: 'invalid' }).email, 'email')
  assert.equal(validateContact({ ...valid, category: 'FEEDBACK', rating: '6' }).rating, 'rating')
  assert.deepEqual(validateContact({ ...valid, category: 'FEEDBACK', subject: '', rating: '5' }), {})
})
