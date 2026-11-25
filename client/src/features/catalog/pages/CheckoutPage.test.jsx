import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../../auth/context/AuthContextValue'
import { CartContext } from '../context/CartContextValue'
import { LocalizationProvider } from '../../localization/context/LocalizationContext'
import { CheckoutPage } from './CheckoutPage'
import { products } from '../data/products'
import * as checkoutService from '../services/checkoutService'

vi.mock('../../../shared/toast/useToast', () => ({ useToast: () => ({ showToast: vi.fn() }) }))

const clearCart = vi.fn()
beforeEach(() => { clearCart.mockReset() })

function renderCheckout(items = [{ product: products[0], quantity: 1 }]) {
  return render(<LocalizationProvider><AuthContext.Provider value={{ user: null, isBootstrapping: false }}>
    <CartContext.Provider value={{ detailedItems: items, clearCart, itemCount: 1, subtotal: 12 }}>
      <MemoryRouter initialEntries={['/checkout']}><Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/cart" element={<h1>Cart page</h1>} />
        <Route path="/order-confirmation/:orderId" element={<h1>Order saved</h1>} />
      </Routes></MemoryRouter>
    </CartContext.Provider>
  </AuthContext.Provider></LocalizationProvider>)
}

test('empty cart redirects without rendering payment fields', async () => {
  renderCheckout([])
  expect(await screen.findByRole('heading', { name: 'Cart page' })).toBeInTheDocument()
})

test('invalid checkout focuses first invalid field and does not clear cart', async () => {
  renderCheckout()
  await userEvent.click(screen.getByRole('button', { name: 'Pay & place order' }))
  expect(screen.getByRole('textbox', { name: /^First name/ })).toHaveFocus()
  expect(screen.getByRole('textbox', { name: /^Email/ })).toHaveAttribute('aria-invalid', 'true')
  expect(clearCart).not.toHaveBeenCalled()
})

test('delivery draft survives remount but payment fields are never persisted', async () => {
  const view = renderCheckout()
  await userEvent.click(screen.getByRole('button', { name: 'Successful order' }))
  view.unmount()
  renderCheckout()
  expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue('Alex')
  expect(screen.getByRole('textbox', { name: 'Card number' })).toHaveValue('')
  expect(screen.getByLabelText('Security code')).toHaveValue('')
})

test('declined payment keeps cart and re-enables submission', async () => {
  renderCheckout()
  await userEvent.click(screen.getByRole('button', { name: 'Declined card' }))
  await userEvent.click(screen.getByRole('button', { name: 'Pay & place order' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/declined/i)
  expect(screen.getByRole('button', { name: 'Pay & place order' })).toBeEnabled()
  expect(clearCart).not.toHaveBeenCalled()
})

test('duplicate submissions save one order and clear cart only on success', async () => {
  renderCheckout()
  await userEvent.click(screen.getByRole('button', { name: 'Successful order' }))
  const form = screen.getByRole('button', { name: 'Pay & place order' }).closest('form')
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect(await screen.findByRole('heading', { name: 'Order saved' })).toBeInTheDocument()
  expect(clearCart).toHaveBeenCalledOnce()
  const orders = JSON.parse(localStorage.getItem('solcacao.demoOrders'))
  expect(orders).toHaveLength(1)
  expect(orders[0].payment.lastFour).toBe('4242')
  expect(orders[0].payment).not.toHaveProperty('cvv')
  expect(checkoutService.readCheckoutDraft()).toEqual({})
})

test('storage failure preserves cart and allows a retry', async () => {
  vi.spyOn(checkoutService, 'saveDemoOrder').mockImplementation(() => { throw new Error('Storage full') })
  renderCheckout()
  await userEvent.click(screen.getByRole('button', { name: 'Successful order' }))
  await userEvent.click(screen.getByRole('button', { name: 'Pay & place order' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Unable to save/i))
  expect(clearCart).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Pay & place order' })).toBeEnabled()
})
