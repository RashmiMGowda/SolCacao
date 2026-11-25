const jwt = require('jsonwebtoken')
const { env } = require('../config/env')
const { HttpError } = require('../utils/httpError')
const userRepository = require('../modules/users/userRepository')

async function authenticate(req, _res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Missing Bearer token.'))
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] })
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new HttpError(401, 'Token expired. Please sign in again.'))
    }

    return next(new HttpError(401, 'Invalid authentication token.'))
  }

  try {
    if (typeof req.user.sub !== 'string') return next(new HttpError(401, 'Invalid authentication token.'))
    const currentUser = await userRepository.findById(req.user.sub)
    if (!currentUser || !currentUser.isActive) {
      return next(new HttpError(401, 'User session is no longer valid.'))
    }
    if ((req.user.version || 0) !== (currentUser.authVersion || 0)) {
      return next(new HttpError(401, 'Password changed. Please sign in again.'))
    }
    // Roles and account status can change while an issued JWT is still valid.
    req.user = { ...req.user, role: currentUser.role, accountType: currentUser.accountType }
    return next()
  } catch (error) {
    return next(error)
  }
}

function optionalAuthenticate(req, res, next) {
  if (!req.headers.authorization) return next()
  return authenticate(req, res, next)
}

function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required.'))
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to access this resource.'))
    }

    return next()
  }
}

module.exports = { authenticate, optionalAuthenticate, authorizeRoles }
