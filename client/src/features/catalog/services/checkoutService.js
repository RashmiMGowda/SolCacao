import { PHONE_PATTERN, POSTAL_PATTERN } from '../../../shared/validation.js'

const ORDERS_STORAGE_KEY = 'solcacao.demoOrders'

function digits(value = '') {
  return value.replace(/\D/g, '')
}

export function isValidCardNumber(value) {
  if (!/^[\d -]+$/.test(value)) return false
  const number = digits(value)
  if (number.length < 13 || number.length > 19 || /^(\d)\1+$/.test(number)) return false

  let sum = 0
  let shouldDouble = false
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index])
    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

export function isValidExpiry(value, now = new Date()) {
  const match = value.trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/)
  if (!match) return false

  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  const expiry = new Date(year, month, 1)
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return expiry > currentMonth
}

export function validateCheckout(values, now = new Date()) {
  const errors = {}
  const requiredFields = [
    'firstName',
    'lastName',
    'email',
    'street',
    'city',
    'state',
    'postalCode',
    'country',
    'cardName',
  ]

  requiredFields.forEach((field) => {
    if (!values[field]?.trim()) errors[field] = 'required'
  })

  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'email'
  }
  if (!isValidCardNumber(values.cardNumber || '')) errors.cardNumber = 'cardNumber'
  if (!isValidExpiry(values.expiry || '', now)) errors.expiry = 'expiry'
  if (!/^\d{3,4}$/.test(values.cvv || '')) errors.cvv = 'cvv'
  if (values.phone?.trim() && !PHONE_PATTERN.test(values.phone.trim())) errors.phone = 'phone'
  if (values.postalCode?.trim() && !POSTAL_PATTERN.test(values.postalCode.trim())) errors.postalCode = 'postalCode'

  return errors
}

export function isDeclinedDemoCard(value) {
  return digits(value) === '4000000000000002'
}

function readOrders() {
  try {
    const orders = JSON.parse(window.localStorage.getItem(ORDERS_STORAGE_KEY) || '[]')
    return Array.isArray(orders) ? orders : []
  } catch {
    return []
  }
}

export function saveDemoOrder(order) {
  const orders = readOrders()
  window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([order, ...orders]))
}

export function getDemoOrder(orderId, userId = null) {
  const order = readOrders().find((order) => order.id === orderId)
  if (!order) return null
  if (order.userId) return order.userId === userId ? order : null
  try {
    return window.sessionStorage.getItem(`solcacao.guestOrder.${orderId}`) === order.guestToken ? order : null
  } catch { return null }
}

const DELIVERY_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'state', 'postalCode', 'country']
const draftKey = (userId) => `solcacao.checkoutDraft.${userId || 'guest'}`

export function readCheckoutDraft(userId) {
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(draftKey(userId)) || '{}')
    return Object.fromEntries(DELIVERY_FIELDS.filter((key) => typeof draft?.[key] === 'string').map((key) => [key, draft[key]]))
  } catch { return {} }
}

export function saveCheckoutDraft(userId, values) {
  try {
    window.sessionStorage.setItem(draftKey(userId), JSON.stringify(Object.fromEntries(DELIVERY_FIELDS.map((key) => [key, values[key] || '']))))
  } catch { /* Checkout remains usable when draft storage is unavailable. */ }
}

export function clearCheckoutDraft(userId) {
  try { window.sessionStorage.removeItem(draftKey(userId)) } catch { /* Optional draft cleanup. */ }
}

export function getDemoOrdersForUser(userId) {
  if (!userId) return []
  return readOrders().filter((order) => order.userId === userId)
}

export function createOrderId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `SC-${date}-${suffix}`
}

export function getCardLastFour(value) {
  return digits(value).slice(-4)
}
