import { beforeEach, afterEach, expect, test, vi } from 'vitest'

let service
let fetchMock
const form = { cacaoProfile: 'Peru 80%', quantityKg: '25', brandName: 'API campaign', designDetails: '', packagingOption: 'Event Sleeve', whiteLabel: 'company-branding', specialInstructions: '', designFiles: [] }
beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('VITE_AUTH_MODE', 'api')
  vi.stubEnv('VITE_API_BASE_URL', 'https://example.test/api/')
  localStorage.clear()
  localStorage.setItem('solcacao.jwt', 'business-token')
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  service = await import('./requestService')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); localStorage.clear() })
const respond = payload => fetchMock.mockResolvedValueOnce({ ok: true, json: async () => payload })

test('wizard sends authenticated API request with file bytes, then My Requests retrieves saved data', async () => {
  const request = { id: 'saved-id', brandName: form.brandName, status: 'SUBMITTED' }
  respond({ request })
  const design = new File(['%PDF-test'], 'design.pdf', { type: 'application/pdf' })
  expect(await service.submitRequest({ ...form, designFiles: [design] }, 'retry-id')).toEqual(request)
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toBe('https://example.test/api/b2b/requests')
  expect(options.headers.Authorization).toBe('Bearer business-token')
  expect(JSON.parse(options.body)).toMatchObject({ requestId: 'retry-id', quantityKg: 25, attachments: [{ name: 'design.pdf', type: 'application/pdf', data: btoa('%PDF-test') }] })
  respond({ requests: [request] })
  expect(await service.listRequests()).toEqual([request])
  respond({ request })
  expect(await service.getRequest(request.id)).toEqual(request)
  expect(localStorage.getItem('solcacao.b2bRequests')).toBeNull()
})
test('API failures propagate validation details without local persistence fallback', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'Check details', details: { quantityKg: 'Invalid' } } }) })
  await expect(service.submitRequest(form, 'retry-id')).rejects.toMatchObject({ details: { quantityKg: 'Invalid' } })
  expect(localStorage.getItem('solcacao.b2bRequests')).toBeNull()
})
test('account change while reading an upload prevents submission under the next account', async () => {
  let reader
  vi.stubGlobal('FileReader', class { constructor() { reader = this } readAsDataURL() {} })
  const pending = service.submitRequest({ ...form, designFiles: [new File(['x'], 'design.pdf')] }, 'retry-id')
  localStorage.setItem('solcacao.jwt', 'other-account-token')
  reader.result = 'data:application/pdf;base64,eA=='
  reader.onload()
  await expect(pending).rejects.toThrow('session changed')
  expect(fetchMock).not.toHaveBeenCalled()
})
test('response from a previous account is discarded after session change', async () => {
  let resolve
  fetchMock.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const pending = service.listRequests()
  localStorage.setItem('solcacao.jwt', 'other-account-token')
  resolve({ ok: true, json: async () => ({ requests: [{ id: 'private' }] }) })
  await expect(pending).rejects.toThrow('session changed')
})
