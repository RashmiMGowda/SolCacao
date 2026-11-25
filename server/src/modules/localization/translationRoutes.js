const express = require('express')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const repository = require('./translationRepository')
const preferences = require('./languagePreferenceService')
const { authenticate } = require('../../middleware/authMiddleware')

const router = express.Router()
const NAMESPACE_PATTERN = /^[a-z0-9_-]{1,80}$/i

// GET /api/translations -> which languages the API can serve
router.get('/', (_req, res) => {
  res.json({ locales: repository.LOCALES, defaultLocale: repository.DEFAULT_LOCALE })
})

// GET /api/translations/preference -> the signed-in user's saved language (users.preferred_language)
// PUT /api/translations/preference { "locale": "es" } -> save it
// These come before /:locale so "preference" is not read as a language code.
router.get('/preference', authenticate, asyncHandler(async (req, res) => {
  res.json({ locale: await preferences.getPreferredLocale(req.user.sub) })
}))

router.put('/preference', authenticate, express.json({ limit: '1kb' }), asyncHandler(async (req, res) => {
  const locale = await preferences.savePreferredLocale(req.user.sub, req.body?.locale)
  res.json({ locale })
}))

// GET /api/translations/:locale[?namespace=nav] -> the dictionary for one language
router.get('/:locale', asyncHandler(async (req, res) => {
  const { locale } = req.params
  if (!repository.LOCALES.includes(locale)) throw new HttpError(400, 'locale must be en or es.')

  const { namespace } = req.query
  if (namespace != null && (typeof namespace !== 'string' || !NAMESPACE_PATTERN.test(namespace))) {
    throw new HttpError(400, 'namespace must be a short name such as nav or catalog.')
  }

  const { messages, ui, count } = await repository.getBundle(locale, namespace || null)
  if (namespace && !count) throw new HttpError(404, `No translations found for namespace "${namespace}".`)

  // Dictionaries change rarely, so browsers may reuse them briefly.
  res.set('Cache-Control', 'public, max-age=300')
  res.json({ locale, count, messages, ui })
}))

module.exports = { translationRouter: router }
