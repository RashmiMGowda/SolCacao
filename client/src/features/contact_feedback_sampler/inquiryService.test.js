import { afterEach, expect, test, vi } from 'vitest'
import { submitInquiry } from './inquiryService'

vi.mock('../auth/services/authService', () => ({ getAuthMode: () => 'local' }))

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

test('demo mode saves the inquiry in the browser and never calls the network', async () => {
  const fetchSpy = vi.fn()
  vi.stubGlobal('fetch', fetchSpy)

  const inquiry = await submitInquiry({ name: 'Test', email: 'test@example.com', message: 'Hello there' })

  expect(inquiry.reference).toMatch(/^INQ-/)
  expect(fetchSpy).not.toHaveBeenCalled()
  const saved = JSON.parse(window.localStorage.getItem('solcacao.demoInquiries'))
  expect(saved[0].reference).toBe(inquiry.reference)
})
