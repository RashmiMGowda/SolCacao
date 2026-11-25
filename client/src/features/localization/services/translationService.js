import { getAuthMode } from '../../auth/services/authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const TOKEN_KEY = 'solcacao.jwt'

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Loads the dictionary for one language from GET /api/translations/:locale.
// Returns null in the offline demo (no backend), so the bundled dictionaries are used as-is.
export async function fetchTranslations(locale, { signal } = {}) {
  if (getAuthMode() !== 'api') return null

  const response = await fetch(`${API_BASE_URL}/translations/${encodeURIComponent(locale)}`, { signal })
  if (!response.ok) throw new Error(`Translations request failed (${response.status}).`)

  const payload = await response.json()
  if (!isPlainObject(payload?.messages) || !isPlainObject(payload?.ui)) {
    throw new Error('Translations response was not in the expected format.')
  }
  return { messages: payload.messages, ui: payload.ui }
}

// Saves the signed-in user's language (users.preferred_language) through PUT /api/translations/preference.
// Does nothing in the offline demo or when nobody is signed in.
export async function saveLanguagePreference(locale) {
  if (getAuthMode() !== 'api') return null
  const token = window.localStorage.getItem(TOKEN_KEY)
  if (!token) return null

  const response = await fetch(`${API_BASE_URL}/translations/preference`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ locale }),
  })
  if (!response.ok) throw new Error(`Saving the language failed (${response.status}).`)
  return (await response.json()).locale
}
