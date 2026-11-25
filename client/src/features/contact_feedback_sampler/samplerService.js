import { getAuthMode } from '../auth/services/authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const SESSION_KEY = 'solcacao.samplerSession'

function getSessionId() {
  let sessionId = window.localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = window.crypto?.randomUUID?.()
    if (!sessionId) throw new Error('This browser cannot create a sampler session. Please try another browser.')
    window.localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/samplers${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Unable to save your sampler. Please try again.')
    error.details = payload.error?.details || {}
    throw error
  }
  return payload
}

export async function persistSampler(values) {
  if (getAuthMode() !== 'api') return null
  const sessionId = getSessionId()
  const { sampler } = await request('', {
    method: 'POST',
    body: JSON.stringify({ ...values, sessionId }),
  })
  return sampler
}

export async function listSavedSamplers() {
  if (getAuthMode() !== 'api') return []
  const sessionId = encodeURIComponent(getSessionId())
  return (await request(`?sessionId=${sessionId}`)).samplers
}
