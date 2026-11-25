const express = require('express')
const { authenticate, optionalAuthenticate } = require('../../middleware/authMiddleware')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const repository = require('./cartRepository')

const router = express.Router()
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sessionFrom(value, required = true) {
  if (value == null && !required) return null
  if (typeof value !== 'string' || !sessionPattern.test(value)) throw new HttpError(400, 'A valid guest session ID is required.')
  return value.toLowerCase()
}

function ownerFrom(req, sessionValue) {
  if (req.user?.sub) return { userId: req.user.sub }
  return { sessionId: sessionFrom(sessionValue) }
}

function itemsFrom(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.items)) throw new HttpError(400, 'Send a JSON object containing an items array.')
  if (body.items.length > 100) throw new HttpError(400, 'A cart cannot contain more than 100 distinct products.')
  const seen = new Set()
  return body.items.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new HttpError(400, `Cart item ${index + 1} is invalid.`)
    if (typeof item.productId !== 'string' || !item.productId.trim() || item.productId.length > 64) throw new HttpError(400, `Cart item ${index + 1} requires a valid productId.`)
    if (seen.has(item.productId)) throw new HttpError(400, `Duplicate product in cart: ${item.productId}.`)
    seen.add(item.productId)
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new HttpError(400, `Cart item ${index + 1} quantity must be a whole number from 1 to 99.`)
    return { productId: item.productId, quantity: item.quantity }
  })
}

router.get('/', optionalAuthenticate, asyncHandler(async (req, res) => {
  const owner = ownerFrom(req, req.query.sessionId)
  res.json({ cart: await repository.get(owner) })
}))

router.post('/persist', optionalAuthenticate, asyncHandler(async (req, res) => {
  const owner = ownerFrom(req, req.body?.sessionId)
  const items = itemsFrom(req.body)
  res.json({ cart: await repository.persist(owner, items) })
}))

router.post('/merge', authenticate, asyncHandler(async (req, res) => {
  const guestSessionId = sessionFrom(req.body?.guestSessionId)
  res.json(await repository.merge(req.user.sub, guestSessionId))
}))

module.exports = { cartRouter: router, itemsFrom, sessionFrom }
