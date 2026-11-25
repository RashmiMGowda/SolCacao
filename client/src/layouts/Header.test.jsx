import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Header } from './Header'
import { AuthContext } from '../features/auth/context/AuthContextValue'
import { CartContext } from '../features/catalog/context/CartContextValue'
import { LocalizationProvider } from '../features/localization/context/LocalizationContext'

function renderHeader(user = { role: 'CUSTOMER', accountType: 'RETAIL' }) {
  const openCart = vi.fn()
  const logout = vi.fn()
  render(<LocalizationProvider><AuthContext.Provider value={{ user, isAuthenticated: true, logout }}>
    <CartContext.Provider value={{ itemCount: 2, openCart }}><MemoryRouter><Header /></MemoryRouter></CartContext.Provider>
  </AuthContext.Provider></LocalizationProvider>)
  return { openCart, logout }
}

test('one language selector stays outside mobile navigation and switches locale', async () => {
  renderHeader()
  await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
  const menu = screen.getByRole('navigation', { name: 'Mobile navigation' })
  expect(within(menu).queryByRole('button', { name: 'ES – Español' })).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'ES – Español' })).toHaveLength(1)
  await userEvent.click(screen.getByRole('button', { name: 'ES – Español' }))
  expect(document.documentElement).toHaveAttribute('lang', 'es')
  expect(localStorage.getItem('solcacao_locale')).toBe('es')
})

test('customer menu hides business links and closes after navigation', async () => {
  renderHeader()
  const toggle = screen.getByRole('button', { name: 'Toggle navigation' })
  await userEvent.click(toggle)
  const menu = screen.getByRole('navigation', { name: 'Mobile navigation' })
  expect(within(menu).queryByRole('link', { name: 'For Business' })).not.toBeInTheDocument()
  await userEvent.click(within(menu).getByRole('link', { name: 'About' }))
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('Escape restores menu-button focus and opening cart dismisses menu', async () => {
  const { openCart } = renderHeader()
  const toggle = screen.getByRole('button', { name: 'Toggle navigation' })
  await userEvent.click(toggle)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(toggle).toHaveFocus()
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await userEvent.click(toggle)
  await userEvent.click(screen.getByRole('button', { name: 'Cart 2' }))
  expect(openCart).toHaveBeenCalledOnce()
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('logout calls the existing session handler and dismisses the menu', async () => {
  const { logout } = renderHeader()
  await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
  await userEvent.click(within(screen.getByRole('navigation', { name: 'Mobile navigation' })).getByRole('button', { name: 'Sign Out' }))
  expect(logout).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Toggle navigation' })).toHaveAttribute('aria-expanded', 'false')
})
