import { useCallback, useEffect, useMemo, useState } from 'react'
import { en } from '../dictionaries/en'
import { es } from '../dictionaries/es'
import { LocalizationContext } from './LocalizationContextValue'
import { fetchTranslations, saveLanguagePreference } from '../services/translationService'

const DICTIONARIES = { en, es }
const STORAGE_KEY = 'solcacao_locale'
const DEFAULT_LOCALE = 'en'

function getInitialLocale() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'en' || stored === 'es' ? stored : DEFAULT_LOCALE
}

function resolve(dictionary, key) {
  return key
    .split('.')
    .reduce((value, part) => (value && typeof value === 'object' ? value[part] : undefined), dictionary)
}

export function LocalizationProvider({ children }) {
  const [locale, setLocaleState] = useState(getInitialLocale)
  // Dictionaries loaded from the API (database), per language. Empty in the offline demo.
  const [remote, setRemote] = useState({})

  // WCAG 3.1.1: keep <html lang> in sync with the active language
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  // Phase 3: when the backend is available, load the active language from the database.
  // If the request fails, the bundled en/es dictionaries keep the site fully translated.
  useEffect(() => {
    const controller = new AbortController()
    fetchTranslations(locale, { signal: controller.signal })
      .then((bundle) => {
        if (bundle) setRemote((current) => ({ ...current, [locale]: bundle }))
      })
      .catch(() => { /* fall back to the bundled dictionaries */ })
    return () => controller.abort()
  }, [locale])

  // persist = false is used when the language comes from the account, so it is not saved straight back.
  const setLocale = useCallback((nextLocale, { persist = true } = {}) => {
    if (nextLocale !== 'en' && nextLocale !== 'es') return
    setLocaleState(nextLocale)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextLocale)
    }
    if (persist) saveLanguagePreference(nextLocale).catch(() => { /* the choice is still kept in this browser */ })
  }, [])

  const t = useCallback(
    (key) => {
      // Database text wins for plain strings; groups (objects) and missing keys come from the bundled files.
      const fromApi = resolve(remote[locale]?.messages, key)
      if (typeof fromApi === 'string') return fromApi
      const value = resolve(DICTIONARIES[locale], key) ?? resolve(DICTIONARIES[DEFAULT_LOCALE], key)
      return value ?? key
    },
    [locale, remote],
  )

  const remoteUi = remote[locale]?.ui
  const value = useMemo(() => ({ locale, setLocale, t, remoteUi }), [locale, setLocale, t, remoteUi])

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>
}