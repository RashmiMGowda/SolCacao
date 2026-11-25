import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../context/AuthContextValue'
import { LocalizationProvider } from '../../localization/context/LocalizationContext'
import { ProtectedRoute } from './ProtectedRoute'

function renderRoute(session) {
  render(<LocalizationProvider><AuthContext.Provider value={session}>
    <MemoryRouter initialEntries={['/private']}><Routes>
      <Route path="/private" element={<ProtectedRoute allowedRoles={['CUSTOMER']} allowedAccountTypes={['RETAIL']}><h1>Private account</h1></ProtectedRoute>} />
      <Route path="/login" element={<h1>Login required</h1>} />
      <Route path="/unauthorized" element={<h1>Access denied</h1>} />
    </Routes></MemoryRouter>
  </AuthContext.Provider></LocalizationProvider>)
}

test('session loading does not expose protected content', () => {
  renderRoute({ isBootstrapping: true })
  expect(screen.getByText('Loading account...')).toBeInTheDocument()
  expect(screen.queryByText('Private account')).not.toBeInTheDocument()
})

test('guest is redirected to login', async () => {
  renderRoute({ isAuthenticated: false })
  expect(await screen.findByText('Login required')).toBeInTheDocument()
})

test.each([
  { role: 'BUSINESS', accountType: 'B2B' },
  { role: 'CUSTOMER', accountType: 'B2B' },
])('mismatched roles or account types cannot access the page', async (user) => {
  renderRoute({ isAuthenticated: true, user })
  expect(await screen.findByText('Access denied')).toBeInTheDocument()
})

test('matching role and account type render protected content', () => {
  renderRoute({ isAuthenticated: true, user: { role: 'CUSTOMER', accountType: 'RETAIL' } })
  expect(screen.getByText('Private account')).toBeInTheDocument()
})
