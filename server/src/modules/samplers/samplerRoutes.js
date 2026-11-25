const express = require('express')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const repository = require('./samplerRepository')

const router = express.Router()
const sizes = { 6: 1800, 12: 3000, 24: 5200 }
const packages = { 'Classic Box': 0, 'Luxury Gift Box': 500, 'Event Sleeve': 300 }
const chocolates = new Set(['70% Dark Cacao', 'Milk Chocolate', 'Raspberry Dark Chocolate', 'Orange Infusion'])
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sessionFrom(value) {
  if (typeof value !== 'string' || !sessionPattern.test(value)) throw new HttpError(400, 'A valid sampler session ID is required.')
  return value.toLowerCase()
}

function validate(body) {
  const errors = {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Invalid sampler.')
  const boxSize = Number(body.boxSize)
  if (!Object.hasOwn(sizes, boxSize)) errors.boxSize = 'Choose a supported box size.'
  if (typeof body.packaging !== 'string' || !Object.hasOwn(packages, body.packaging)) errors.packaging = 'Choose a supported package.'
  if (!Array.isArray(body.selections) || body.selections.length < 1 || body.selections.length > chocolates.size) {
    errors.selections = 'Choose between one and four chocolate selections.'
  }
  const seen = new Set()
  let count = 0
  const selections = []
  for (const item of Array.isArray(body.selections) ? body.selections : []) {
    if (!item || !chocolates.has(item.name) || seen.has(item.name) || !Number.isInteger(item.quantity) || item.quantity < 1) {
      errors.selections = 'Each selection must have a unique supported chocolate and positive whole quantity.'
      continue
    }
    seen.add(item.name)
    count += item.quantity
    selections.push({ name: item.name, quantity: item.quantity })
  }
  if (Object.keys(sizes).includes(String(boxSize)) && count !== boxSize) errors.selections = `Select exactly ${boxSize} pieces.`
  const giftMessage = body.giftMessage == null ? '' : body.giftMessage
  if (typeof giftMessage !== 'string' || giftMessage.length > 500) errors.giftMessage = 'Use no more than 500 characters.'
  if (Object.keys(errors).length) throw new HttpError(400, 'Check your sampler selections.', errors)
  return { boxSize, packaging: body.packaging, selections, giftMessage: giftMessage.trim() }
}

router.get('/', asyncHandler(async (req, res) => {
  const sessionId = sessionFrom(req.query.sessionId)
  res.json({ samplers: await repository.list(sessionId) })
}))

router.post('/', express.json({ limit: '8kb' }), asyncHandler(async (req, res) => {
  const sessionId = sessionFrom(req.body?.sessionId)
  const values = validate(req.body)
  const sampler = await repository.create(sessionId, values, { base: sizes[values.boxSize], fee: packages[values.packaging] })
  res.status(201).json({ sampler })
}))

module.exports = { samplerRouter: router }
