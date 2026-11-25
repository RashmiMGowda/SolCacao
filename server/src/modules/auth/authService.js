const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { env } = require('../../config/env')
const userRepository = require('../users/userRepository')
const { publicUser } = require('../users/userMapper')
const { HttpError } = require('../../utils/httpError')
const { sendPasswordResetEmail } = require('./mailService')

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      version: user.authVersion || 0,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  )
}

function authResponse(user) {
  return {
    token: createToken(user),
    user: publicUser(user),
  }
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function login(values) {
  const user = await userRepository.findByEmail(values.email)

  if (!user) {
    throw new HttpError(401, 'Incorrect email or password.')
  }

  if (!user.isActive) {
    throw new HttpError(403, 'This account is inactive.')
  }

  const isMatch = await bcrypt.compare(values.password, user.passwordHash)

  if (!isMatch) {
    throw new HttpError(401, 'Incorrect email or password.')
  }

  return authResponse(user)
}

async function register(values) {
  const existingUser = await userRepository.findByEmail(values.email)

  if (existingUser) {
    throw new HttpError(409, 'An account already uses this email.')
  }

  const passwordHash = await bcrypt.hash(values.password, env.bcryptRounds)
  const user = await userRepository.createUser(values, passwordHash)

  return authResponse(user)
}

async function requestPasswordReset(values) {
  const user = await userRepository.findByEmail(values.email)
  const response = {
    message: 'If an account exists for this email, reset instructions have been sent.',
  }

  if (!user || !user.isActive) {
    return response
  }

  const resetToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashResetToken(resetToken)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30)

  await userRepository.savePasswordResetToken(user.id, tokenHash, expiresAt)

  const resetUrl = `${env.clientOrigin}/reset-password?token=${encodeURIComponent(resetToken)}`

  try {
    const mailResult = await sendPasswordResetEmail({
      email: user.email,
      firstName: user.firstName,
      resetUrl,
    })

    response.emailSent = mailResult.sent
    if (!mailResult.sent) response.emailNote = mailResult.reason
  } catch (error) {
    response.emailSent = false
    response.emailNote = 'Email could not be sent. Use the development reset link.'
  }

  if (env.nodeEnv === 'development' && !response.emailSent) {
    response.resetToken = resetToken
  }

  return env.nodeEnv === 'production' ? { message: response.message } : response
}

async function resetPassword(values) {
  const tokenHash = hashResetToken(values.token)
  const passwordHash = await bcrypt.hash(values.password, env.bcryptRounds)
  const consumed = await userRepository.consumePasswordReset(tokenHash, passwordHash)

  if (!consumed) {
    throw new HttpError(400, 'Reset link expired. Request a new link.', {
      token: 'Reset link expired. Request a new link.',
    })
  }

  return { message: 'Password updated. You can now sign in.' }
}

async function updateCurrentUser(userId, values) {
  const currentUser = await userRepository.findById(userId)

  if (!currentUser || !currentUser.isActive) {
    throw new HttpError(401, 'User session is no longer valid.')
  }

  const duplicate = await userRepository.findByEmail(values.email)
  if (duplicate && duplicate.id !== userId) {
    throw new HttpError(409, 'An account already uses this email.', {
      email: 'An account already uses this email.',
    })
  }

  const updatedUser = await userRepository.updateUserProfile(userId, values)
  return { user: publicUser(updatedUser) }
}

async function listBusinessAccounts() {
  const users = await userRepository.listBusinessAccounts()
  return { users: users.map(publicUser) }
}

async function updateBusinessApproval(userId, values) {
  const user = await userRepository.findById(userId)

  if (!user || !user.isActive || user.role !== 'BUSINESS') {
    throw new HttpError(404, 'Business account was not found.')
  }

  const updatedUser = await userRepository.updateBusinessApproval(userId, values)
  return { user: publicUser(updatedUser) }
}

async function requireApprovedBusiness(userId) {
  const user = await userRepository.findById(userId)

  if (!user || !user.isActive) {
    throw new HttpError(401, 'User session is no longer valid.')
  }

  if (user.role !== 'BUSINESS' && user.role !== 'ADMIN') {
    throw new HttpError(403, 'A business account is required.')
  }

  if (user.role === 'BUSINESS' && user.corporatePartner?.approvalStatus !== 'APPROVED') {
    throw new HttpError(403, 'Business account approval is required before custom quote access.')
  }

  return publicUser(user)
}

async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId)

  if (!user || !user.isActive) {
    throw new HttpError(401, 'User session is no longer valid.')
  }

  return publicUser(user)
}

module.exports = {
  getCurrentUser,
  listBusinessAccounts,
  login,
  register,
  requestPasswordReset,
  requireApprovedBusiness,
  resetPassword,
  updateBusinessApproval,
  updateCurrentUser,
}
