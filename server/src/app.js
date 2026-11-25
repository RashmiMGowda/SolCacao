const express = require('express')
const cors = require('cors')
const { env } = require('./config/env')
const { authRouter } = require('./modules/auth/authRoutes')
const { b2bRouter } = require('./modules/b2b/requestRoutes')
const { inquiryRouter } = require('./modules/inquiries/inquiryRoutes')
const { samplerRouter } = require('./modules/samplers/samplerRoutes')
const { productRouter } = require('./modules/catalog/productRoutes')
const { cartRouter } = require('./modules/cart/cartRoutes')
const { translationRouter } = require('./modules/localization/translationRoutes')
const { orderRouter } = require('./modules/orders/orderRoutes')
const { errorHandler, notFound } = require('./middleware/errorHandler')

const app = express()
app.disable('x-powered-by')
if (env.trustLoopbackProxy) app.set('trust proxy', 'loopback')

const isLocalViteOrigin = (origin) => /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(origin)

app.use(
  cors({
    origin(origin, callback) {
      // Direct browser checks and local Vite development use either hostname.
      if (!origin || origin === env.clientOrigin || isLocalViteOrigin(origin)) return callback(null, true)
      return callback(new Error('Origin is not allowed by CORS.'))
    },
    credentials: true,
  }),
)
app.use('/api/b2b', b2bRouter)
app.use(express.json({ limit: '1mb' }))
app.use('/api/inquiries', inquiryRouter)
app.use('/api/samplers', samplerRouter)
app.use('/api/products', productRouter)
app.use('/api/cart', cartRouter)
app.use('/api/translations', translationRouter)
app.use('/api/orders', orderRouter)

app.get('/api/health', (_req, res) => {
  const database = env.useMockAuthRepository || !env.hasDatabaseConfig ? 'mock-json' : 'mysql'

  res.json({
    status: 'ok',
    service: 'SolCacao API',
    database,
  })
})

app.use('/api/auth', authRouter)

app.get('/api/ready', async (_req, res) => {
  try {
    if (env.useMockAuthRepository || !env.hasDatabaseConfig) return res.status(503).json({ status: 'not-ready', database: 'mock-json' })
    await require('./db/mysql').query('SELECT 1 AS ready')
    return res.json({ status: 'ready', database: 'mysql' })
  } catch { return res.status(503).json({ status: 'not-ready', database: 'mysql' }) }
})

app.use(notFound)
app.use(errorHandler)

module.exports = { app }
