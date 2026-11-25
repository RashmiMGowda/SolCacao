import { test } from 'vitest'
import assert from 'node:assert/strict'
import { canAccessPath, canSeeBusinessLinks, getAccountPath, getLoginDestination } from './roleAccess.js'

const customer = { role: 'CUSTOMER', accountType: 'RETAIL' }
const business = { role: 'BUSINESS', accountType: 'B2B' }
const admin = { role: 'ADMIN', accountType: 'RETAIL' }

test('login defaults to the correct account for each role', () => {
  for (const [user, path] of [[customer, '/profile'], [business, '/business-profile'], [admin, '/admin']]) {
    assert.equal(getAccountPath(user), path)
    assert.equal(getLoginDestination(user), path)
    assert.equal(getLoginDestination(user, '/unauthorized'), path)
  }
})

test('customers never return to a business or admin route after login', () => {
  for (const path of ['/business-profile', '/business/quote', '/b2b/quote', '/business/requests/123', '/admin', '/business/accounts', '/business/manage/123']) {
    assert.equal(canAccessPath(customer, path), false)
    assert.equal(getLoginDestination(customer, path), '/profile')
  }
  assert.equal(getLoginDestination(customer, '/checkout'), '/checkout')
  assert.equal(getLoginDestination(customer, '//example.com'), '/profile')
})

test('admin management and business submissions have separate permissions', () => {
  assert.equal(getLoginDestination(admin, '/profile'), '/admin')
  assert.equal(getLoginDestination(admin, '/business/manage/123'), '/business/manage/123')
  assert.equal(getLoginDestination(admin, '/business/quote'), '/admin')
  assert.equal(getLoginDestination(business, '/admin'), '/business-profile')
  assert.equal(getLoginDestination(business, '/business/requests/123'), '/business/requests/123')
  assert.equal(canAccessPath(null, '/profile'), false)
  assert.equal(canAccessPath(null, '/admin'), false)
})

test('business links are hidden only from signed-in customers', () => {
  assert.equal(canSeeBusinessLinks(customer), false)
  assert.equal(canSeeBusinessLinks(business), true)
  assert.equal(canSeeBusinessLinks(admin), true)
  assert.equal(canSeeBusinessLinks(null), true)
})
