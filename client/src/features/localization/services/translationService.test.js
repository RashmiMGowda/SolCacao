import { afterEach, expect, test, vi } from 'vitest'

const mode = vi.hoisted(() => ({ value: 'local' }))
vi.mock('../../auth/services/authService', () => ({ getAuthMode: () => mode.value }))

import { fetchTranslations, saveLanguagePreference } from './translationService'

afterEach(() => {
  vi.unstubAllGlobals()
  mode.value = 'local'
})

test('offline demo mode uses the bundled dictionaries and never calls the network', async () => {
  const fetchSpy = vi.fn()
  vi.stubGlobal('fetch', fetchSpy)
  expect(await fetchTranslations('es')).toBeNull()
  expect(fetchSpy).not.toHaveBeenCalled()
})

test('API mode requests the language and returns messages and ui text', async () => {
  mode.value = 'api'
  const fetchSpy = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ locale: 'es', messages: { nav: { home: 'Inicio' } }, ui: { 'Shop now': 'Comprar ahora' } }),
  })
  vi.stubGlobal('fetch', fetchSpy)

  const bundle = await fetchTranslations('es')

  expect(fetchSpy.mock.calls[0][0]).toMatch(/\/translations\/es$/)
  expect(bundle).toEqual({ messages: { nav: { home: 'Inicio' } }, ui: { 'Shop now': 'Comprar ahora' } })
})

test('API mode rejects failed responses and unexpected shapes', async () => {
  mode.value = 'api'
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }))
  await expect(fetchTranslations('en')).rejects.toThrow(/500/)

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [], ui: {} }) }))
  await expect(fetchTranslations('en')).rejects.toThrow(/format/)
})

test('saving the language needs API mode and a signed-in user, then sends the token', async () => {
  const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ locale: 'es' }) })
  vi.stubGlobal('fetch', fetchSpy)

  expect(await saveLanguagePreference('es')).toBeNull() // demo mode
  mode.value = 'api'
  window.localStorage.clear()
  expect(await saveLanguagePreference('es')).toBeNull() // nobody signed in
  expect(fetchSpy).not.toHaveBeenCalled()

  window.localStorage.setItem('solcacao.jwt', 'token-123')
  expect(await saveLanguagePreference('es')).toBe('es')
  const [url, options] = fetchSpy.mock.calls[0]
  expect(url).toMatch(/\/translations\/preference$/)
  expect(options.method).toBe('PUT')
  expect(options.headers.Authorization).toBe('Bearer token-123')
  expect(JSON.parse(options.body)).toEqual({ locale: 'es' })

  fetchSpy.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
  await expect(saveLanguagePreference('en')).rejects.toThrow(/401/)
  window.localStorage.clear()
})
