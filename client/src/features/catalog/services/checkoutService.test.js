import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  isDeclinedDemoCard,
  isValidCardNumber,
  isValidExpiry,
  validateCheckout,
  getDemoOrdersForUser,
  saveDemoOrder,
  getDemoOrder,
  readCheckoutDraft,
  saveCheckoutDraft,
} from './checkoutService.js'

test('accepts the successful and declined Luhn-valid demo cards', () => {
  assert.equal(isValidCardNumber('4242 4242 4242 4242'), true)
  assert.equal(isValidCardNumber('4000 0000 0000 0002'), true)
  assert.equal(isDeclinedDemoCard('4000 0000 0000 0002'), true)
})

test('rejects an invalid card number', () => {
  assert.equal(isValidCardNumber('4242abc424242424242'), false)
  assert.equal(isValidCardNumber('1234 5678 9012 3456'), false)
  assert.equal(isValidCardNumber('0000 0000 0000 0000'), false)
})

test('rejects malformed delivery and security code values', () => {
  const errors = validateCheckout({ phone: '-------', postalCode: '!', cvv: '1a2b3' })
  assert.equal(errors.phone, 'phone')
  assert.equal(errors.postalCode, 'postalCode')
  assert.equal(errors.cvv, 'cvv')
})

test('confirmation enforces ownership and guest session access; drafts exclude payment data', () => {
  const previousWindow = globalThis.window
  const makeStorage = () => {
    const data = new Map()
    return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
  }
  globalThis.window = { localStorage: makeStorage(), sessionStorage: makeStorage() }
  try {
    saveDemoOrder({ id: 'owned', userId: 'a' })
    assert.equal(getDemoOrder('owned', 'b'), null)
    assert.equal(getDemoOrder('owned'), null)
    assert.equal(getDemoOrder('owned', 'a').id, 'owned')
    saveDemoOrder({ id: 'guest', userId: null, guestToken: 'secret' })
    assert.equal(getDemoOrder('guest'), null)
    window.sessionStorage.setItem('solcacao.guestOrder.guest', 'secret')
    assert.equal(getDemoOrder('guest').id, 'guest')
    saveCheckoutDraft('a', { firstName: 'Alex', cardNumber: '4242424242424242', cvv: '123', expiry: '12/30' })
    assert.equal(readCheckoutDraft('a').firstName, 'Alex')
    assert.equal(readCheckoutDraft('a').cardNumber, undefined)
    assert.equal(readCheckoutDraft('a').cvv, undefined)
    assert.equal(readCheckoutDraft('a').expiry, undefined)
    assert.deepEqual(readCheckoutDraft('b'), {})
  } finally { globalThis.window = previousWindow }
})

test('order history includes only orders placed by the signed-in customer', () => {
  const previousWindow = globalThis.window
  const storage = new Map()
  globalThis.window = { localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } }
  try {
    saveDemoOrder({ id: 'first', userId: 'customer-a' })
    saveDemoOrder({ id: 'second', userId: 'customer-b' })
    saveDemoOrder({ id: 'guest', userId: null })
    saveDemoOrder({ id: 'latest', userId: 'customer-a' })
    assert.deepEqual(getDemoOrdersForUser('customer-a').map((order) => order.id), ['latest', 'first'])
    assert.deepEqual(getDemoOrdersForUser(null), [])
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})

test('validates expiration month against the current month', () => {
  const now = new Date('2026-10-12T12:00:00Z')
  assert.equal(isValidExpiry('11/26', now), true)
  assert.equal(isValidExpiry('09/26', now), false)
  assert.equal(isValidExpiry('13/27', now), false)
})

test('returns field-level checkout validation errors', () => {
  const errors = validateCheckout(
    {
      firstName: '',
      lastName: 'Customer',
      email: 'invalid-email',
      street: '1 Main Street',
      city: 'Arlington',
      state: 'TX',
      postalCode: '76010',
      country: 'United States',
      cardName: 'Demo Customer',
      cardNumber: '1234',
      expiry: '01/20',
      cvv: '12',
    },
    new Date('2026-10-12T12:00:00Z'),
  )

  assert.deepEqual(errors, {
    firstName: 'required',
    email: 'email',
    cardNumber: 'cardNumber',
    expiry: 'expiry',
    cvv: 'cvv',
  })
})
