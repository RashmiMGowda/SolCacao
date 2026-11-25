import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mode = vi.hoisted(() => ({ value: 'api' }))
vi.mock('../../auth/services/authService', () => ({ getAuthMode: () => mode.value }))

import { LocalizationProvider } from './LocalizationContext'
import { useLocalization } from '../hooks/useLocalization'
import { useUiText } from '../hooks/useUiText'

function Probe() {
  const { t } = useLocalization()
  const ui = useUiText()
  return (
    <div>
      <p data-testid="home">{t('nav.home')}</p>
      <p data-testid="group">{typeof t('b2b.messages')}</p>
      <p data-testid="ui">{ui('Shop now')}</p>
    </div>
  )
}

function renderProbe() {
  return render(<LocalizationProvider><Probe /></LocalizationProvider>)
}

beforeEach(() => {
  window.localStorage.clear()
  mode.value = 'api'
})
afterEach(() => vi.unstubAllGlobals())

test('API text replaces bundled text for plain strings, keeps groups, and covers ui messages', async () => {
  window.localStorage.setItem('solcacao_locale', 'es')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ messages: { nav: { home: 'Inicio (BD)' }, b2b: { messages: { x: 'y' } } }, ui: { 'Shop now': 'Comprar (BD)' } }),
  }))

  renderProbe()
  expect(screen.getByTestId('home')).toHaveTextContent('Inicio')

  await waitFor(() => expect(screen.getByTestId('home')).toHaveTextContent('Inicio (BD)'))
  expect(screen.getByTestId('ui')).toHaveTextContent('Comprar (BD)')
  // The API only returned part of b2b.messages; the bundled lookup table must survive.
  expect(screen.getByTestId('group')).toHaveTextContent('object')
})

test('if the API is down the bundled dictionaries keep the page translated', async () => {
  window.localStorage.setItem('solcacao_locale', 'es')
  const fetchSpy = vi.fn().mockRejectedValue(new Error('network'))
  vi.stubGlobal('fetch', fetchSpy)

  renderProbe()
  await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

  expect(screen.getByTestId('home')).toHaveTextContent('Inicio')
  expect(screen.getByTestId('ui')).toHaveTextContent('Comprar ahora')
})

test('offline demo mode does not call the API', () => {
  mode.value = 'local'
  const fetchSpy = vi.fn()
  vi.stubGlobal('fetch', fetchSpy)
  renderProbe()
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(screen.getByTestId('home')).toHaveTextContent('Home')
})
