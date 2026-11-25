import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LocalizationProvider } from '../../localization/context/LocalizationContext'
import { AuthContext } from '../context/AuthContextValue'
import { LoginPage } from './LoginPage'

vi.mock('../services/authService', async (importOriginal) => ({
  ...(await importOriginal()),
  getAuthMode: () => 'api',
}))

const login = vi.fn()
const register = vi.fn()

beforeEach(() => { login.mockReset(); register.mockReset() })

function renderLogin() {
  return render(
    <LocalizationProvider><AuthContext.Provider value={{ login, register }}>
      <MemoryRouter initialEntries={['/login']}><Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<h1>Customer account</h1>} />
        <Route path="/admin" element={<h1>Admin account</h1>} />
      </Routes></MemoryRouter>
    </AuthContext.Provider></LocalizationProvider>,
  )
}

test('invalid email is shown inline without calling authentication', async () => {
  const user = userEvent.setup()
  renderLogin()
  await user.clear(screen.getByRole('textbox', { name: 'Email' }))
  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'invalid')
  await user.click(screen.getAllByRole('button', { name: 'Sign In', exact: true }).at(-1))
  expect(screen.getByRole('textbox', { name: /^Email/ })).toHaveAttribute('aria-invalid', 'true')
  expect(login).not.toHaveBeenCalled()
})

async function submitCredentials() {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'customer@solcacao.test')
  await user.type(screen.getByLabelText(/^Password/), 'Password123!')
  await user.click(screen.getAllByRole('button', { name: 'Sign In', exact: true }).at(-1))
}

test.each([
  [{ role: 'CUSTOMER', accountType: 'RETAIL' }, 'Customer account'],
  [{ role: 'ADMIN' }, 'Admin account'],
])('successful login navigates to the correct role account', async (account, heading) => {
  login.mockResolvedValue(account)
  renderLogin()
  await submitCredentials()
  expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
})

test('authentication failure is displayed and submit becomes available again', async () => {
  login.mockRejectedValue(new Error('Invalid credentials'))
  renderLogin()
  await submitCredentials()
  expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Sign In', exact: true }).at(-1)).toBeEnabled()
})

test('registration requires fields and switches to business-specific fields', async () => {
  const user = userEvent.setup()
  renderLogin()
  await user.click(screen.getByRole('button', { name: 'Create Account', exact: true }))
  await user.click(screen.getAllByRole('button', { name: 'Create Account', exact: true }).at(-1))
  expect(screen.getByRole('textbox', { name: /^First Name/ })).toHaveAttribute('aria-invalid', 'true')
  expect(register).not.toHaveBeenCalled()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Account Type' }), 'B2B')
  expect(screen.getByRole('textbox', { name: 'Company Name' })).toBeInTheDocument()
})
