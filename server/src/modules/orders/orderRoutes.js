const express = require('express')
const { authenticate, optionalAuthenticate } = require('../../middleware/authMiddleware')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const repository = require('./orderRepository')
const { validateCreateOrder } = require('./orderValidators')

const router = express.Router()

router.post('/', optionalAuthenticate, asyncHandler(async (req, res) => {
  const values = validateCreateOrder(req.body)
  const result = await repository.create(req.user?.sub || null, values)
  res.status(201).json(result)
}))

router.get('/', authenticate, asyncHandler(async (req, res) => {
  res.json({ orders: await repository.list(req.user.sub) })
}))

router.get('/:orderId', optionalAuthenticate, asyncHandler(async (req, res) => {
  const guestToken = req.get('x-guest-order-token') || ''
  if (guestToken.length > 128) throw new HttpError(400, 'Guest order token is invalid.')
  const order = await repository.getById(req.params.orderId, { userId: req.user?.sub || null, guestToken })
  if (!order) throw new HttpError(404, 'Order not found.')
  res.json({ order })
}))

module.exports = { orderRouter: router }
