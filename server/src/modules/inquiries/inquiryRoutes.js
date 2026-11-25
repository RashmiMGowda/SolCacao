const express = require('express')
const { asyncHandler } = require('../../utils/asyncHandler')
const { validateInquiry } = require('./inquiryValidators')
const repository = require('./inquiryRepository')
const { sendInquiryNotification } = require('../auth/mailService')

const router = express.Router()

router.post('/', express.json({ limit: '16kb' }), asyncHandler(async (req, res) => {
  const values = validateInquiry(req.body)
  const inquiry = await repository.create(values)

  // A saved inquiry remains successful even if optional SMTP is unavailable.
  const notification = await sendInquiryNotification({ ...inquiry, ...values }).catch(() => ({ sent: false }))

  res.status(201).json({
    inquiry: repository.toPublicInquiry(inquiry),
    notificationSent: notification.sent,
  })
}))

module.exports = { inquiryRouter: router }
