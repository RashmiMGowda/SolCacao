import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LocalizationProvider } from '../localization/context/LocalizationContext'
import ContactConfirmationPage from './ContactConfirmationPage'

function renderConfirmation(state) {
  return render(<LocalizationProvider><MemoryRouter initialEntries={[{ pathname: '/contact-confirmation', state }]}>
    <ContactConfirmationPage />
  </MemoryRouter></LocalizationProvider>)
}

test.each(['{broken', 'null', '[]', '{"reference":42}'])('invalid inquiry storage does not crash confirmation', (stored) => {
  sessionStorage.setItem('solcacao-last-inquiry', stored)
  renderConfirmation()
  expect(screen.getByText(/INQ-DEMO/)).toBeInTheDocument()
  expect(screen.getByText(/respond within 24–48 hours/)).toBeInTheDocument()
})

test('valid reference survives refresh and router state takes precedence', () => {
  sessionStorage.setItem('solcacao-last-inquiry', JSON.stringify({ reference: 'INQ-SAVED' }))
  const view = renderConfirmation()
  expect(screen.getByText(/INQ-SAVED/)).toBeInTheDocument()
  view.unmount()
  renderConfirmation({ reference: 'INQ-ROUTE' })
  expect(screen.getByText(/INQ-ROUTE/)).toBeInTheDocument()
})

test('unavailable session storage falls back safely', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
    if (key === 'solcacao-last-inquiry') throw new Error('Storage blocked')
    return null
  })
  renderConfirmation()
  expect(screen.getByText(/INQ-DEMO/)).toBeInTheDocument()
})

test('Spanish confirmation identifies a received message', () => {
  localStorage.setItem('solcacao_locale', 'es')
  renderConfirmation()
  expect(screen.getByRole('heading', { name: 'Mensaje recibido' })).toBeInTheDocument()
  expect(screen.getByText(/responderá dentro de 24 a 48 horas/)).toBeInTheDocument()
})
