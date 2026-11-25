import { beforeEach, afterEach, expect, test, vi } from 'vitest'

let auth
let fetchMock
const user = { id: 'api-user', firstName: 'Test', lastName: 'User', email: 'api@solcacao.test', role: 'CUSTOMER', accountType: 'RETAIL', isActive: true, addresses: [] }
function respond(payload, status = 200) {
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => payload })
}
beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('VITE_AUTH_MODE', 'api')
  vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:5000/api')
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  auth = await import('./authService')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

test('API login saves JWT and restores user using authenticated fetch', async () => {
  respond({ token: 'test-jwt', user })
  expect((await auth.loginWithEmail(user.email, 'Password123!')).id).toBe(user.id)
  expect(localStorage.getItem('solcacao.jwt')).toBe('test-jwt')
  respond({ user })
  expect((await auth.getStoredSession()).id).toBe(user.id)
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer test-jwt')
  expect(localStorage.getItem('solcacao.users')).toBeNull()
})
test('business registration sends company details and never client-controlled roles', async () => {
  respond({ token: 'business-jwt', user: { ...user, role: 'BUSINESS', accountType: 'B2B' } })
  await auth.registerAccount({ firstName: 'Test', lastName: 'Business', email: user.email, phone: '6825550101', password: 'Password123!', confirmPassword: 'Password123!', companyName: 'Test Company', industry: 'Hospitality', role: 'ADMIN' }, 'B2B')
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toContain('/auth/register')
  expect(JSON.parse(options.body)).toMatchObject({ accountType: 'B2B', corporatePartner: { companyName: 'Test Company' } })
  expect(JSON.parse(options.body).role).toBeUndefined()
})
test('profile save maps the existing UI address structure to the API', async () => {
  localStorage.setItem('solcacao.jwt', 'jwt')
  respond({ user })
  await auth.updateAccount(user.id, { ...user, addresses: [{ city: 'Arlington' }] })
  expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).address.city).toBe('Arlington')
})
test('admin listing and review use protected API endpoints', async () => {
  localStorage.setItem('solcacao.jwt', 'admin-jwt')
  respond({ users: [user] })
  expect(await auth.listBusinessAccounts()).toHaveLength(1)
  respond({ user })
  await auth.updateBusinessApproval(user.id, 'APPROVED')
  expect(fetchMock.mock.calls[1][1].method).toBe('PATCH')
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer admin-jwt')
})
test('expired API session clears JWT rather than falling back to demo users', async () => {
  localStorage.setItem('solcacao.jwt', 'expired')
  respond({ error: { message: 'Expired' } }, 401)
  expect(await auth.getStoredSession()).toBeNull()
  expect(localStorage.getItem('solcacao.jwt')).toBeNull()
})
test('API field errors remain available for inline validation', async () => {
  respond({ error: { message: 'Invalid input', details: { email: 'Already registered' } } }, 409)
  await expect(auth.loginWithEmail(user.email, 'Password123!')).rejects.toMatchObject({ status: 409, details: { email: 'Already registered' } })
})
test('password recovery submits both steps to the API without browser reset storage', async () => {
  respond({ message: 'Check your email' })
  await auth.requestPasswordReset(user.email)
  expect(fetchMock.mock.calls[0][0]).toContain('/auth/forgot-password')
  respond({ message: 'Password updated' })
  await auth.resetPassword({ token: 'one-use-token', password: 'Changed123!', confirmPassword: 'Changed123!' })
  expect(fetchMock.mock.calls[1][0]).toContain('/auth/reset-password')
  expect(localStorage.getItem('solcacao.passwordResets')).toBeNull()
})
