const { env } = require('../config/env')

function notFound(req, res) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  })
}

function errorHandler(error, req, res, _next) {
  const duplicate = error.code === 'ER_DUP_ENTRY'
  const status = duplicate ? 409 : error.status || 500

  res.status(status).json({
    error: {
      message: duplicate ? 'An account already uses this email.' : status === 500 ? 'Internal server error.' : error.message,
      details: error.details || undefined,
      stack: env.nodeEnv === 'development' ? error.stack : undefined,
    },
  })
}

module.exports = { errorHandler, notFound }
