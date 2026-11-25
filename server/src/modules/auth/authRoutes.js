const express = require('express')
const { authenticate, authorizeRoles } = require('../../middleware/authMiddleware')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const authService = require('./authService')
const {
  validateBusinessApproval,
  validateForgotPassword,
  validateLogin,
  validateProfileUpdate,
  validateRegister,
  validateResetPassword,
} = require('./authValidators')

const router = express.Router()
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ error: { message: 'Send a JSON object in the request body.' } })
  }
  next()
})
const { rateLimit } = require('../../middleware/rateLimit')
const limitAuthAttempts = rateLimit({ limit: 30 })
router.use(['/login', '/register', '/forgot-password', '/reset-password'], limitAuthAttempts)

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { values, errors } = validateRegister(req.body)

    if (Object.keys(errors).length) {
      throw new HttpError(400, 'Complete all required fields.', errors)
    }

    const result = await authService.register(values)
    res.status(201).json(result)
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { values, errors } = validateLogin(req.body)

    if (Object.keys(errors).length) {
      throw new HttpError(400, 'Complete all required fields.', errors)
    }

    const result = await authService.login(values)
    res.json(result)
  }),
)

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { values, errors } = validateForgotPassword(req.body)

    if (Object.keys(errors).length) {
      throw new HttpError(400, 'Complete all required fields.', errors)
    }

    const result = await authService.requestPasswordReset(values)
    res.json(result)
  }),
)

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { values, errors } = validateResetPassword(req.body)

    if (Object.keys(errors).length) {
      throw new HttpError(400, 'Complete all required fields.', errors)
    }

    const result = await authService.resetPassword(values)
    res.json(result)
  }),
)

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.sub)
    res.json({ user })
  }),
)

router.put(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const currentUser = await authService.getCurrentUser(req.user.sub)
    const { values, errors } = validateProfileUpdate(req.body, currentUser.accountType)

    if (Object.keys(errors).length) {
      throw new HttpError(400, 'Complete all required fields.', errors)
    }

    const result = await authService.updateCurrentUser(req.user.sub, values)
    res.json(result)
  }),
)

router.get(
  '/admin/business-accounts',
  authenticate,
  authorizeRoles('ADMIN'),
  asyncHandler(async (_req, res) => {
    const result = await authService.listBusinessAccounts()
    res.json(result)
  }),
)

router.patch(
  '/admin/business-accounts/:userId/approval',
  authenticate,
  authorizeRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const { values, errors } = validateBusinessApproval(req.body)

    if (Object.keys(errors).length) {
      throw new HttpError(400, 'Complete all required fields.', errors)
    }

    const result = await authService.updateBusinessApproval(req.params.userId, values)
    res.json(result)
  }),
)

router.get('/customer-only', authenticate, authorizeRoles('CUSTOMER'), (req, res) => {
  res.json({ message: 'Customer route access granted.', user: req.user })
})

router.get('/business-only', authenticate, authorizeRoles('BUSINESS', 'ADMIN'), (req, res) => {
  res.json({ message: 'Business/Admin route access granted.', user: req.user })
})

router.get('/admin-only', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  res.json({ message: 'Admin route access granted.', user: req.user })
})

router.get(
  '/business-approved-only',
  authenticate,
  authorizeRoles('BUSINESS', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const user = await authService.requireApprovedBusiness(req.user.sub)
    res.json({ message: 'Approved business route access granted.', user })
  }),
)

module.exports = { authRouter: router }
