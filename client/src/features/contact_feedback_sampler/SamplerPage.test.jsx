import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CartContext } from '../catalog/context/CartContextValue'
import { LocalizationProvider } from '../localization/context/LocalizationContext'
import { listSavedSamplers, persistSampler } from './samplerService'
import SamplerPage from './SamplerPage'

vi.mock('./samplerService', () => ({
  listSavedSamplers: vi.fn(),
  persistSampler: vi.fn(),
}))

beforeEach(() => {
  listSavedSamplers.mockResolvedValue([{
    id: 'saved-sampler-1', boxSize: 6, packaging: 'Classic Box', totalPriceCents: 1800,
  }])
  persistSampler.mockResolvedValue(null)
})

test('loads and displays persisted samplers when the module opens', async () => {
  render(<LocalizationProvider><CartContext.Provider value={{ addCustomItem: vi.fn(), openCart: vi.fn() }}>
    <MemoryRouter><SamplerPage /></MemoryRouter>
  </CartContext.Provider></LocalizationProvider>)

  expect(await screen.findByRole('heading', { name: 'Saved samplers' })).toBeInTheDocument()
  expect(screen.getByText('6 pieces · Classic Box · $18.00')).toBeInTheDocument()
  expect(listSavedSamplers).toHaveBeenCalledOnce()
})
