import { afterEach, beforeEach, expect, test, vi } from 'vitest'

let service
let fetchMock
const respond = (payload, status = 200) => fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => payload })

beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:5000/api')
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  window.localStorage.clear()
  window.sessionStorage.clear()
  service = await import('./orderService')
})

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

test('creates a guest order without transmitting full card data and saves its lookup token', async () => {
  respond({ order: { id: 'SC-20261110-ABC12345' }, guestToken: 'guest-secret' }, 201)
  const values = { email: 'guest@example.com', paymentLastFour: '4242', items: [{ productId: 'ghana-72', quantity: 1 }] }
  const order = await service.createApiOrder(values)
  expect(order.id).toBe('SC-20261110-ABC12345')
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(values)
  expect(fetchMock.mock.calls[0][1].body).not.toContain('4242 4242 4242 4242')
  expect(sessionStorage.getItem(`solcacao.guestOrder.${order.id}`)).toBe('guest-secret')
})

test('fetches guest detail with its token and user history with JWT', async () => {
  sessionStorage.setItem('solcacao.guestOrder.SC-1', 'guest-secret')
  respond({ order: { id: 'SC-1' } })
  await service.getApiOrder('SC-1')
  expect(fetchMock.mock.calls[0][1].headers['X-Guest-Order-Token']).toBe('guest-secret')

  localStorage.setItem('solcacao.jwt', 'user-jwt')
  respond({ orders: [{ id: 'SC-2' }] })
  expect(await service.listApiOrders()).toHaveLength(1)
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer user-jwt')
})

test('surfaces API error status and details', async () => {
  respond({ error: { message: 'Out of stock', details: { available: 0 } } }, 409)
  await expect(service.createApiOrder({})).rejects.toMatchObject({ status: 409, details: { available: 0 } })
})
