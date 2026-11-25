import { test } from 'vitest'
import assert from 'node:assert/strict'
import { enUi, esUi, translateUiText } from './uiMessages.js'

test('all added interface strings have nonempty English and Spanish entries', () => {
  assert.deepEqual(Object.keys(enUi).sort(), Object.keys(esUi).sort())
  for (const [key, value] of Object.entries(esUi)) {
    assert.ok(value.trim(), key)
    assert.equal(translateUiText(key, 'en'), key)
    assert.equal(translateUiText(key, 'es'), value)
  }
})
test('translation preserves user content and interpolates system notifications', () => {
  assert.equal(translateUiText('Example Company', 'es'), 'Example Company')
  assert.equal(translateUiText('Example Company marked approved.', 'es'), 'Example Company: estado aprobado.')
  assert.equal(translateUiText('{company} marked {status}.', 'en', { company: 'Test', status: 'approved' }), 'Test marked approved.')
})
