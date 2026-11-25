const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'solcacao.jwt'
const guestTokenKey = orderId => `solcacao.guestOrder.${orderId}`

async function request(path, options = {}) {
  const token = window.localStorage.getItem(TOKEN_KEY)
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_BASE_URL}/orders${path}`, { ...options, headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Unable to load order information.')
    error.status = response.status
    error.details = payload.error?.details || {}
    throw error
  }
  return payload
}

export async function createApiOrder(values) {
  const result = await request('', { method: 'POST', body: JSON.stringify(values) })
  if (result.guestToken) window.sessionStorage.setItem(guestTokenKey(result.order.id), result.guestToken)
  return result.order
}

export async function getApiOrder(orderId) {
  const guestToken = window.sessionStorage.getItem(guestTokenKey(orderId))
  const payload = await request(`/${encodeURIComponent(orderId)}`, {
    headers: guestToken ? { 'X-Guest-Order-Token': guestToken } : {},
  })
  return payload.order
}

export async function listApiOrders() {
  const payload = await request('')
  return payload.orders
}
