const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
const sessionKey = 'solcacao.guestCartSession'

export async function requestCart(path, token, body) {
  const response = await fetch(`${baseUrl}/cart${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error?.message || 'Could not synchronize the cart.')
  return result.cart
}

export function guestCartSession() {
  let id = localStorage.getItem(sessionKey)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(sessionKey, id)
  }
  return id
}
