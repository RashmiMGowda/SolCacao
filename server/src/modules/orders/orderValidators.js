const { HttpError } = require('../../utils/httpError')

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function requiredText(value, name, maximum) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${name} is required.`)
  if (value.trim().length > maximum) throw new HttpError(400, `${name} must use no more than ${maximum} characters.`)
  return value.trim()
}

function validateItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new HttpError(400, 'Include between 1 and 100 order items.')
  const seen = new Set()
  return items.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new HttpError(400, `Order item ${index + 1} is invalid.`)
    const productId = requiredText(item.productId, `Order item ${index + 1} productId`, 64)
    if (seen.has(productId)) throw new HttpError(400, `Duplicate product in order: ${productId}.`)
    seen.add(productId)
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new HttpError(400, `Order item ${index + 1} quantity must be a whole number from 1 to 99.`)
    return { productId, quantity: item.quantity }
  })
}

function validateCreateOrder(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Send a JSON order object.')
  const email = requiredText(body.email, 'Email', 255).toLowerCase()
  if (!emailPattern.test(email)) throw new HttpError(400, 'Enter a valid email address.')
  const address = body.shippingAddress
  if (!address || typeof address !== 'object' || Array.isArray(address)) throw new HttpError(400, 'Shipping address is required.')
  const paymentLastFour = requiredText(body.paymentLastFour, 'Payment card last four digits', 4)
  if (!/^\d{4}$/.test(paymentLastFour)) throw new HttpError(400, 'Payment card last four digits must contain four digits.')
  let sessionId = null
  if (body.sessionId != null && body.sessionId !== '') {
    if (typeof body.sessionId !== 'string' || !sessionPattern.test(body.sessionId)) throw new HttpError(400, 'sessionId must be a valid UUID v4.')
    sessionId = body.sessionId.toLowerCase()
  }
  return {
    items: validateItems(body.items),
    email,
    phone: body.phone == null ? '' : requiredText(body.phone, 'Phone', 30),
    paymentLastFour,
    sessionId,
    shippingAddress: {
      firstName: requiredText(address.firstName, 'First name', 80),
      lastName: requiredText(address.lastName, 'Last name', 80),
      street: requiredText(address.street, 'Street', 255),
      city: requiredText(address.city, 'City', 100),
      state: requiredText(address.state, 'State', 100),
      postalCode: requiredText(address.postalCode, 'Postal code', 20),
      country: requiredText(address.country, 'Country', 100),
    },
  }
}

module.exports = { validateCreateOrder, validateItems }
