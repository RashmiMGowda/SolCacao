import assert from 'node:assert/strict'
import { test } from 'vitest'
import { cartReducer, initialCartState, restoreCartItems } from './cartReducer.js'

test('restored cart normalizes quantities, merges duplicates and enforces current stock', () => {
  assert.deepEqual(restoreCartItems([
    { productId: 'madagascar-55', quantity: '2.9' },
    { productId: 'madagascar-55', quantity: 1 },
    { productId: 'ecuador-75', quantity: 999 },
    { productId: 'mexico-60', quantity: 1 },
    { productId: 'missing', quantity: 1 },
  ]), [
    { productId: 'madagascar-55', quantity: 3 },
    { productId: 'ecuador-75', quantity: 3 },
  ])
})

test('restored cart rejects malformed data and cannot override catalog product snapshots', () => {
  assert.deepEqual(restoreCartItems(null), [])
  assert.deepEqual(restoreCartItems({}), [])
  assert.deepEqual(restoreCartItems([
    null, {}, { productId: 'madagascar-55', quantity: true },
    ...[-1, 0, 0.5, 'invalid', Infinity, NaN].map((quantity) => ({ productId: 'madagascar-55', quantity })),
    { productId: 'custom-sampler-invalid', quantity: 1, product: { kind: 'sampler' } },
  ]), [])
  assert.deepEqual(restoreCartItems([{ productId: 'ecuador-75', quantity: 100, product: { stock: 1000, price: 0 } }]), [{ productId: 'ecuador-75', quantity: 3 }])
})

test('restored custom sampler retains valid configuration', () => {
  const product = { id: 'custom-sampler-restore', kind: 'sampler', price: 35, stock: 20, en: { name: 'Custom sampler' }, sampler: { giftMessage: 'Thank you' } }
  assert.deepEqual(restoreCartItems([{ productId: product.id, product, quantity: '2' }]), [{ productId: product.id, product, quantity: 2 }])
})

test('adds an item and combines repeated additions', () => {
  const first = cartReducer(initialCartState, {
    type: 'ADD_ITEM',
    productId: 'madagascar-55',
    quantity: 2,
  })
  const second = cartReducer(first, {
    type: 'ADD_ITEM',
    productId: 'madagascar-55',
    quantity: 3,
  })

  assert.deepEqual(second.items, [{ productId: 'madagascar-55', quantity: 5 }])
})

test('does not allow a cart quantity above available inventory', () => {
  const state = cartReducer(initialCartState, {
    type: 'ADD_ITEM',
    productId: 'ecuador-75',
    quantity: 20,
  })

  assert.equal(state.items[0].quantity, 3)
})

test('ignores products that are out of stock', () => {
  const state = cartReducer(initialCartState, {
    type: 'ADD_ITEM',
    productId: 'mexico-60',
    quantity: 1,
  })

  assert.deepEqual(state.items, [])
})

test('updates and removes cart items', () => {
  const populated = {
    ...initialCartState,
    items: [{ productId: 'peru-truffles', quantity: 2 }],
  }
  const updated = cartReducer(populated, {
    type: 'SET_QUANTITY',
    productId: 'peru-truffles',
    quantity: 4,
  })
  const removed = cartReducer(updated, {
    type: 'REMOVE_ITEM',
    productId: 'peru-truffles',
  })

  assert.equal(updated.items[0].quantity, 4)
  assert.deepEqual(removed.items, [])
})

test('adds and updates a configured sampler product', () => {
  const sampler = {
    id: 'custom-sampler-test',
    kind: 'sampler',
    price: 35,
    stock: 20,
  }
  const added = cartReducer(initialCartState, {
    type: 'ADD_CUSTOM_ITEM',
    product: sampler,
    quantity: 1,
  })
  const updated = cartReducer(added, {
    type: 'SET_QUANTITY',
    productId: sampler.id,
    quantity: 3,
  })

  assert.deepEqual(added.items, [
    { productId: sampler.id, product: sampler, quantity: 1 },
  ])
  assert.equal(updated.items[0].quantity, 3)
  assert.equal(updated.items[0].product.price, 35)
})
