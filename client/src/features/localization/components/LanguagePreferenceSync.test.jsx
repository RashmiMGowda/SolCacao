import { beforeEach, expect, test, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'

const state = vi.hoisted(() => ({ mode: 'api', user: null, save: vi.fn().mockResolvedValue('es') }))
vi.mock('../../auth/services/authService', () => ({ getAuthMode: () => state.mode }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('../services/translationService', () => ({ saveLanguagePreference: (...args) => state.save(...args) }))

import { LanguagePreferenceSync } from './LanguagePreferenceSync'
import { LocalizationContext } from '../context/LocalizationContextValue'

function renderSync(locale = 'en') {
  const setLocale = vi.fn()
  render(
    <LocalizationContext.Provider value={{ locale, setLocale, t: (key) => key }}>
      <LanguagePreferenceSync />
    </LocalizationContext.Provider>,
  )
  return { setLocale }
}

beforeEach(() => {
  state.mode = 'api'
  state.user = null
  state.save.mockClear()
})

test('an existing account that saved Spanish switches the site to Spanish without saving it again', async () => {
  state.user = { id: 'u1', preferredLanguage: 'es', createdAt: '2020-01-01T00:00:00Z' }
  const { setLocale } = renderSync('en')
  await waitFor(() => expect(setLocale).toHaveBeenCalledWith('es', { persist: false }))
  expect(state.save).not.toHaveBeenCalled()
})

test('a brand-new account keeps the language already chosen and saves it', async () => {
  state.user = { id: 'u2', preferredLanguage: 'en', createdAt: new Date().toISOString() }
  const { setLocale } = renderSync('es')
  await waitFor(() => expect(state.save).toHaveBeenCalledWith('es'))
  expect(setLocale).not.toHaveBeenCalled()
})

test('nothing happens when the languages already match, nobody is signed in, or in demo mode', () => {
  state.user = { id: 'u3', preferredLanguage: 'en', createdAt: '2020-01-01T00:00:00Z' }
  expect(renderSync('en').setLocale).not.toHaveBeenCalled()

  state.user = null
  expect(renderSync('es').setLocale).not.toHaveBeenCalled()

  state.mode = 'local'
  state.user = { id: 'u4', preferredLanguage: 'es', createdAt: '2020-01-01T00:00:00Z' }
  expect(renderSync('en').setLocale).not.toHaveBeenCalled()
  expect(state.save).not.toHaveBeenCalled()
})
