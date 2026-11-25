require('dotenv').config()
const { randomBytes } = require('node:crypto')

const configuredSecret = process.env.JWT_SECRET
if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32 || configuredSecret.includes('replace-with'))) {
  throw new Error('Production requires a private JWT_SECRET of at least 32 characters.')
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  host: process.env.HOST || '0.0.0.0',
  trustLoopbackProxy: process.env.TRUST_LOOPBACK_PROXY === 'true',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173',
  jwtSecret: configuredSecret || randomBytes(48).toString('hex'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  useMockAuthRepository: process.env.USE_MOCK_AUTH_REPOSITORY === 'true',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    inquiryRecipient: process.env.INQUIRY_RECIPIENT,
  },
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
}

env.hasDatabaseConfig = Boolean(env.db.host && env.db.user && env.db.database)
env.hasSmtpConfig = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass)
if (env.nodeEnv === 'production' && (env.useMockAuthRepository || !env.hasDatabaseConfig)) {
  throw new Error('Production requires MySQL configuration and USE_MOCK_AUTH_REPOSITORY=false.')
}

module.exports = { env }
