const express = require('express')
const { authenticate } = require('../../middleware/authMiddleware')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { requireApprovedBusiness, getCurrentUser } = require('../auth/authService')
const { validateRequest, uuid } = require('./requestValidators')
const repository = require('./requestRepository')
const users = require('../users/userRepository')
const { publicUser } = require('../users/userMapper')
const router = express.Router()

router.use(authenticate, asyncHandler(async (req, _res, next) => {
  const current = await getCurrentUser(req.user.sub)
  if (current.role === 'ADMIN') { req.business = current; return next() }
  req.business = await requireApprovedBusiness(req.user.sub)
  if (!req.business.corporatePartner?.id) throw new HttpError(403, 'A business partner profile is required.')
  next()
}))
router.get('/requests', asyncHandler(async (req, res) => {
  res.json({ requests: (await repository.list(req.business.role === 'ADMIN' ? null : req.business.corporatePartner.id)).map(repository.publicRequest) })
}))
router.get('/accounts', asyncHandler(async (req, res) => {
  if (req.business.role !== 'ADMIN') throw new HttpError(403, 'Owner access required.')
  res.json({ accounts: (await users.listBusinessAccounts()).map(publicUser) })
}))
router.post('/accounts/:userId/approval', express.json({ limit: '4kb' }), asyncHandler(async (req, res) => {
  if (req.business.role !== 'ADMIN') throw new HttpError(403, 'Owner access required.')
  const { status, reason = '' } = req.body || {}
  if (!['APPROVED', 'REJECTED'].includes(status) || typeof reason !== 'string' || reason.length > 500 || (status === 'REJECTED' && !reason.trim())) throw new HttpError(400, 'Choose approval or rejection with a reason up to 500 characters.')
  const account = await users.setBusinessApproval(req.params.userId, status, status === 'APPROVED' ? '' : reason.trim())
  if (!account || account.role !== 'BUSINESS') throw new HttpError(404, 'Business account not found.')
  res.json({ account: publicUser(account) })
}))
router.post('/requests', express.json({ limit: '8mb' }), asyncHandler(async (req, res) => {
  if (req.business.role === 'ADMIN') throw new HttpError(403, 'Submit requests from an approved business account.')
  const { values, attachments } = validateRequest(req.body)
  const request = await repository.create(values, attachments, req.business)
  res.status(201).json({ request: repository.publicRequest(request) })
}))
router.get('/requests/:id', asyncHandler(async (req, res) => {
  const item = uuid.test(req.params.id) && await repository.find(req.params.id, req.business.role === 'ADMIN' ? null : req.business.corporatePartner.id)
  if (!item) throw new HttpError(404, 'Request not found.')
  res.json({ request: repository.publicRequest(item) })
}))
router.get('/requests/:id/files/:fileId', asyncHandler(async (req, res) => {
  const item = uuid.test(req.params.id) && await repository.find(req.params.id, req.business.role === 'ADMIN' ? null : req.business.corporatePartner.id)
  const file = item?.files.find(value => value.id === req.params.fileId)
  if (!file) throw new HttpError(404, 'Attachment not found.')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')
  res.type('application/octet-stream')
  res.download(repository.attachmentPath(file), file.originalFilename, error => {
    if (error && !res.headersSent) res.status(404).json({ error: { message: 'Attachment not found.' } })
  })
}))
router.post('/requests/:id/review', asyncHandler(async (req, res) => {
  if (req.business.role !== 'ADMIN') throw new HttpError(403, 'Owner access required.')
  if (!uuid.test(req.params.id)) throw new HttpError(404, 'Request not found.')
  res.json({ request: repository.publicRequest(await repository.transition(req.params.id, null, { type: 'review' }, req.business.id)) })
}))
router.post('/requests/:id/quote', express.json({ limit: '16kb' }), asyncHandler(async (req, res) => {
  if (req.business.role !== 'ADMIN') throw new HttpError(403, 'Owner access required.')
  if (!uuid.test(req.params.id)) throw new HttpError(404, 'Request not found.')
  const { amountCents, validUntil, notes = '' } = req.body || {}
  if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 2147483647 || typeof validUntil !== 'string' || !Number.isFinite(Date.parse(validUntil)) || Date.parse(validUntil) <= Date.now() || typeof notes !== 'string' || notes.length > 2000) throw new HttpError(400, 'Enter a valid amount, future expiry date, and notes up to 2,000 characters.')
  res.json({ request: repository.publicRequest(await repository.transition(req.params.id, null, { type: 'quote', amountCents, validUntil: new Date(validUntil).toISOString(), notes: notes.trim() }, req.business.id)) })
}))
router.post('/requests/:id/respond', express.json({ limit: '1kb' }), asyncHandler(async (req, res) => {
  if (req.business.role === 'ADMIN') throw new HttpError(403, 'A business account must respond to its own quote.')
  if (!uuid.test(req.params.id)) throw new HttpError(404, 'Request not found.')
  if (!['ACCEPTED', 'DECLINED'].includes(req.body?.decision)) throw new HttpError(400, 'Select accept or decline.')
  res.json({ request: repository.publicRequest(await repository.transition(req.params.id, req.business.corporatePartner.id, { type: 'respond', decision: req.body.decision }, req.business.id)) })
}))
module.exports = { b2bRouter: router }
