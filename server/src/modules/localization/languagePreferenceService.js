const { HttpError } = require('../../utils/httpError')
const userRepository = require('../users/userRepository')
const { LOCALES } = require('./translationRepository')

// Reads and writes the logged-in user's saved language (users.preferred_language).
// It reuses the user repository (MySQL or JSON fallback), so no other module has to change.

async function getPreferredLocale(userId) {
  const user = await userRepository.findById(userId)
  if (!user) throw new HttpError(404, 'User not found.')
  return LOCALES.includes(user.preferredLanguage) ? user.preferredLanguage : 'en'
}

async function savePreferredLocale(userId, locale) {
  if (!LOCALES.includes(locale)) throw new HttpError(400, 'locale must be en or es.')
  const user = await userRepository.findById(userId)
  if (!user) throw new HttpError(404, 'User not found.')

  await userRepository.updateUserProfile(userId, {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    preferredLanguage: locale,
  })
  return locale
}

module.exports = { getPreferredLocale, savePreferredLocale }
