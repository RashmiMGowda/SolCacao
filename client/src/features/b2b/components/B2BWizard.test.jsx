import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../auth/context/AuthContextValue'
import { LocalizationProvider } from '../../localization/context/LocalizationContext'
import { en } from '../../localization/dictionaries/en'
import { es } from '../../localization/dictionaries/es'
import B2BWizard from './B2BWizard'
import BusinessGate from './BusinessGate'
import { submitRequest } from '../services/requestService'

vi.mock('../services/requestService', () => ({ submitRequest: vi.fn() }))
const account = id => ({ id, role: 'BUSINESS', accountType: 'B2B', corporatePartner: { companyName: `Company ${id}`, approvalStatus: 'APPROVED' } })
const refreshSession = vi.fn().mockResolvedValue(undefined)
function tree(id) {
  return <LocalizationProvider><AuthContext.Provider value={{ user: account(id), refreshSession, isBootstrapping: false }}><MemoryRouter><BusinessGate><B2BWizard /></BusinessGate></MemoryRouter></AuthContext.Provider></LocalizationProvider>
}
test.each([['en', en], ['es', es]])('four-step wizard validates and submits in %s', async (locale, dictionary) => {
  localStorage.setItem('solcacao_locale', locale)
  const text = dictionary.b2b.wizard
  const user = userEvent.setup()
  submitRequest.mockResolvedValue({ id: 'saved-request', status: 'SUBMITTED' })
  render(tree('A'))
  const quantity = await screen.findByLabelText(text.quantity)
  await user.clear(quantity)
  await user.type(quantity, '4')
  await user.click(screen.getByRole('button', { name: text.next, exact: true }))
  expect(screen.getByRole('alert')).toHaveTextContent(text.quantityError)
  await user.clear(quantity)
  await user.type(quantity, '25')
  await user.click(screen.getByRole('button', { name: text.next, exact: true }))
  await user.clear(screen.getByLabelText(text.brand))
  await user.type(screen.getByLabelText(text.brand), 'Campaign test')
  await user.click(screen.getByRole('button', { name: text.next, exact: true }))
  await user.click(screen.getByRole('button', { name: text.review, exact: true }))
  expect(screen.getByText('Campaign test')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: text.submit, exact: true }))
  expect(await screen.findByText(text.success)).toBeInTheDocument()
  expect(submitRequest).toHaveBeenLastCalledWith(expect.objectContaining({ brandName: 'Campaign test', quantityKg: '25' }), expect.any(String))
  expect(screen.getByRole('link', { name: text.view })).toHaveAttribute('href', '/business/requests/saved-request')
})
test('switching business accounts discards the previous wizard draft', async () => {
  const user = userEvent.setup()
  const view = render(tree('A'))
  await screen.findByLabelText(en.b2b.wizard.quantity)
  await user.click(screen.getByRole('button', { name: en.b2b.wizard.next, exact: true }))
  await user.clear(screen.getByLabelText(en.b2b.wizard.brand))
  await user.type(screen.getByLabelText(en.b2b.wizard.brand), 'Private campaign A')
  view.rerender(tree('B'))
  await user.click(screen.getByRole('button', { name: en.b2b.wizard.next, exact: true }))
  expect(screen.getByLabelText(en.b2b.wizard.brand)).toHaveValue('Company B')
})
