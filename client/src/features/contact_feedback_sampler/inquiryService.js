import { getAuthMode } from '../auth/services/authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const LOCAL_INQUIRIES_KEY = 'solcacao.demoInquiries'

// Offline demo mode (no backend): keep the message in this browser, like demo orders and B2B requests.
function saveDemoInquiry(values) {
  const reference = `INQ-${Date.now().toString(36).toUpperCase()}`
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOCAL_INQUIRIES_KEY) || '[]')
    window.localStorage.setItem(
      LOCAL_INQUIRIES_KEY,
      JSON.stringify([{ ...values, reference, createdAt: new Date().toISOString() }, ...saved].slice(0, 50)),
    )
  } catch { /* Storage can be blocked; the confirmation still shows the reference. */ }
  return { reference }
}

export async function submitInquiry(values) {
  if (getAuthMode() !== 'api') return saveDemoInquiry(values)

  const response = await fetch(`${API_BASE_URL}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Unable to submit your message. Please try again.')
    error.details = payload.error?.details || {}
    throw error
  }

  return payload.inquiry
}
