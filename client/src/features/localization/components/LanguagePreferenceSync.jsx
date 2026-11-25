import { useEffect, useRef } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { useLocalization } from '../hooks/useLocalization'
import { getAuthMode } from '../../auth/services/authService'
import { saveLanguagePreference } from '../services/translationService'

const NEW_ACCOUNT_WINDOW_MS = 2 * 60 * 1000

// Keeps the site language and the account's saved language (users.preferred_language) together.
//  - Someone signs in (or the session is restored): the account's language is applied.
//  - Someone just created an account: the language they were already using is saved instead.
// Renders nothing; does nothing in the offline demo.
export function LanguagePreferenceSync() {
  const { user } = useAuth()
  const { locale, setLocale } = useLocalization()
  const handledUserId = useRef(null)

  useEffect(() => {
    if (getAuthMode() !== 'api') return
    if (!user) {
      handledUserId.current = null
      return
    }
    if (handledUserId.current === user.id) return
    handledUserId.current = user.id

    const saved = user.preferredLanguage
    if (saved !== 'en' && saved !== 'es') return
    if (saved === locale) return

    const createdAt = Date.parse(user.createdAt)
    const isNewAccount = Number.isFinite(createdAt) && Date.now() - createdAt < NEW_ACCOUNT_WINDOW_MS
    if (isNewAccount) {
      saveLanguagePreference(locale).catch(() => { /* kept in this browser */ })
    } else {
      setLocale(saved, { persist: false })
    }
  }, [user, locale, setLocale])

  return null
}
