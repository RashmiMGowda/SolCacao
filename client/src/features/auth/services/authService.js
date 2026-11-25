import { demoUsers } from './demoUsers'

const USERS_KEY = 'solcacao.users'
const SESSION_KEY = 'solcacao.session'
const TOKEN_KEY = 'solcacao.jwt'
const RESET_KEY = 'solcacao.passwordResets'

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'local'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

function isApiMode() {
  return AUTH_MODE === 'api'
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function seedUsers() {
  const stored = window.localStorage.getItem(USERS_KEY)
  if (stored) {
    const users = JSON.parse(stored)
    const missingDemoUsers = demoUsers.filter(
      (demoUser) =>
        !users.some(
          (user) =>
            user.id === demoUser.id ||
            user.email.toLowerCase() === demoUser.email.toLowerCase(),
        ),
    )

    if (missingDemoUsers.length) {
      const mergedUsers = [...users, ...clone(missingDemoUsers)]
      saveUsers(mergedUsers)
      return mergedUsers
    }

    return users
  }

  window.localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers))
  return clone(demoUsers)
}

function saveUsers(users) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function readResetTokens() {
  return JSON.parse(window.localStorage.getItem(RESET_KEY) || '[]')
}

function saveResetTokens(tokens) {
  window.localStorage.setItem(RESET_KEY, JSON.stringify(tokens))
}

function withoutPassword(user) {
  const safeUser = { ...user }
  delete safeUser.password
  delete safeUser.passwordHash
  return safeUser
}

function normalizeUser(user) {
  if (!user) return null

  return withoutPassword({
    ...user,
    accountType: user.accountType || (user.role === 'BUSINESS' ? 'B2B' : 'RETAIL'),
    addresses: user.addresses || [],
  })
}

async function requestApi(path, options = {}) {
  const token = window.localStorage.getItem(TOKEN_KEY)
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      payload.error?.message || payload.message || 'Unable to complete the request.'
    const error = new Error(message)
    error.status = response.status
    error.details = payload.error?.details || payload.errors || {}
    throw error
  }

  return payload
}

function toRegisterPayload(values, accountType) {
  const isB2B = accountType === 'B2B'

  return {
    accountType,
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone,
    password: values.password,
    confirmPassword: values.confirmPassword,
    preferredLanguage: 'en',
    address: isB2B
      ? undefined
      : {
          label: 'Default',
          street: values.street,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode,
          country: values.country || 'United States',
        },
    corporatePartner: isB2B
      ? {
          companyName: values.companyName,
          industry: values.industry,
          businessPhone: values.businessPhone || values.phone,
          website: values.website,
        }
      : undefined,
  }
}

async function getApiSession() {
  const token = window.localStorage.getItem(TOKEN_KEY)

  if (!token) return null

  try {
    const payload = await requestApi('/auth/me')
    return normalizeUser(payload.user)
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      if (window.localStorage.getItem(TOKEN_KEY) === token) window.localStorage.removeItem(TOKEN_KEY)
      return null
    }
    throw error
  }
}

function getLocalSession() {
  const session = window.localStorage.getItem(SESSION_KEY)
  if (!session) return null

  const users = seedUsers()
  const parsed = JSON.parse(session)
  const user = users.find((item) => item.id === parsed.userId)

  return user?.isActive ? normalizeUser(user) : null
}

export function getAuthMode() {
  return AUTH_MODE
}

export async function getStoredSession() {
  if (isApiMode()) return getApiSession()
  return getLocalSession()
}

function loginLocally(email, password) {
  const users = seedUsers()
  const user = users.find(
    (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
  )

  if (!user || user.password !== password) {
    throw new Error('Incorrect email or password.')
  }

  if (!user.isActive) {
    throw new Error('This account is inactive.')
  }

  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ userId: user.id, issuedAt: new Date().toISOString() }),
  )

  return normalizeUser(user)
}

async function loginWithApi(email, password) {
  const payload = await requestApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  window.localStorage.setItem(TOKEN_KEY, payload.token)
  return normalizeUser(payload.user)
}

export async function loginWithEmail(email, password) {
  if (isApiMode()) return loginWithApi(email, password)
  return loginLocally(email, password)
}

function registerLocally(values, accountType) {
  const users = seedUsers()
  const email = values.email.trim().toLowerCase()
  const exists = users.some((item) => item.email.toLowerCase() === email)

  if (exists) {
    throw new Error('An account already exists for this email.')
  }

  const isB2B = accountType === 'B2B'
  const user = {
    id: createId('usr'),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email,
    password: values.password,
    phone: values.phone.trim(),
    role: isB2B ? 'BUSINESS' : 'CUSTOMER',
    accountType: isB2B ? 'B2B' : 'RETAIL',
    preferredLanguage: 'en',
    isActive: true,
    addresses: isB2B
      ? []
      : [
          {
            id: createId('addr'),
            label: 'Default',
            street: values.street?.trim() || '',
            city: values.city?.trim() || '',
            state: values.state?.trim() || '',
            postalCode: values.postalCode?.trim() || '',
            country: values.country?.trim() || 'United States',
            isDefault: true,
          },
        ],
    corporatePartner: isB2B
      ? {
          id: createId('corp'),
          companyName: values.companyName.trim(),
          industry: values.industry.trim(),
          businessPhone: values.businessPhone?.trim() || values.phone.trim(),
          website: values.website?.trim() || '',
          approvalStatus: 'PENDING',
          reviewedAt: null,
          rejectionReason: '',
        }
      : undefined,
  }

  users.push(user)
  saveUsers(users)
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ userId: user.id, issuedAt: new Date().toISOString() }),
  )

  return normalizeUser(user)
}

async function registerWithApi(values, accountType) {
  const payload = await requestApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(toRegisterPayload(values, accountType)),
  })

  window.localStorage.setItem(TOKEN_KEY, payload.token)
  return normalizeUser(payload.user)
}

export async function registerAccount(values, accountType) {
  if (isApiMode()) return registerWithApi(values, accountType)
  return registerLocally(values, accountType)
}

export async function updateAccount(userId, patch) {
  if (isApiMode()) {
    const payload = await requestApi('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({
        ...patch,
        address: patch.addresses?.[0],
        corporatePartner: patch.corporatePartner,
      }),
    })

    return normalizeUser(payload.user)
  }

  const users = seedUsers()
  const index = users.findIndex((item) => item.id === userId)

  if (index === -1) {
    throw new Error('Unable to find account.')
  }

  const duplicate = users.find(
    (item) =>
      item.id !== userId &&
      item.email.toLowerCase() === patch.email.trim().toLowerCase(),
  )

  if (duplicate) {
    const error = new Error('An account already uses this email.')
    error.details = { email: 'An account already uses this email.' }
    throw error
  }

  users[index] = {
    ...users[index],
    ...patch,
    email: patch.email.trim().toLowerCase(),
    corporatePartner: patch.corporatePartner
      ? {
          ...users[index].corporatePartner,
          ...patch.corporatePartner,
          approvalStatus: users[index].corporatePartner?.approvalStatus === 'REJECTED'
            ? 'PENDING' : users[index].corporatePartner?.approvalStatus || 'PENDING',
          reviewedAt: users[index].corporatePartner?.approvalStatus === 'REJECTED'
            ? null : users[index].corporatePartner?.reviewedAt,
          rejectionReason: users[index].corporatePartner?.approvalStatus === 'REJECTED'
            ? '' : users[index].corporatePartner?.rejectionReason || '',
        }
      : users[index].corporatePartner,
    addresses: patch.addresses ?? users[index].addresses,
  }

  saveUsers(users)
  return normalizeUser(users[index])
}

export async function listBusinessAccounts() {
  if (isApiMode()) {
    const payload = await requestApi('/auth/admin/business-accounts')
    return (payload.users || []).map(normalizeUser)
  }

  const users = seedUsers()
  return users.filter((item) => item.role === 'BUSINESS').map(normalizeUser)
}

export async function updateBusinessApproval(userId, approvalStatus, rejectionReason = '') {
  if (isApiMode()) {
    const payload = await requestApi(`/auth/admin/business-accounts/${userId}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ approvalStatus, rejectionReason }),
    })

    return normalizeUser(payload.user)
  }

  const users = seedUsers()
  const index = users.findIndex((item) => item.id === userId && item.role === 'BUSINESS')

  if (index === -1) {
    throw new Error('Business account was not found.')
  }

  users[index].corporatePartner = {
    ...users[index].corporatePartner,
    approvalStatus,
    reviewedAt: new Date().toISOString(),
    rejectionReason: approvalStatus === 'REJECTED' ? rejectionReason : '',
  }

  saveUsers(users)
  return normalizeUser(users[index])
}

export async function requestPasswordReset(email) {
  if (isApiMode()) {
    return requestApi('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  const users = seedUsers()
  const user = users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
  const result = {
    message: 'If an account exists for this email, reset instructions have been sent.',
  }

  if (!user) return result

  const token = createId('reset')
  const expiresAt = Date.now() + 1000 * 60 * 30
  const tokens = readResetTokens().filter((item) => item.expiresAt > Date.now())

  tokens.push({ token, userId: user.id, expiresAt, usedAt: null })
  saveResetTokens(tokens)

  return { ...result, resetToken: token }
}

export async function resetPassword({ token, password, confirmPassword }) {
  if (isApiMode()) {
    return requestApi('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password, confirmPassword }),
    })
  }

  const users = seedUsers()
  const tokens = readResetTokens()
  const resetToken = tokens.find(
    (item) => item.token === token && !item.usedAt && item.expiresAt > Date.now(),
  )

  if (!resetToken) {
    const error = new Error('Reset link expired. Request a new link.')
    error.details = { token: 'Reset link expired. Request a new link.' }
    throw error
  }

  const user = users.find((item) => item.id === resetToken.userId)

  if (!user) {
    throw new Error('Reset link expired. Request a new link.')
  }

  user.password = password
  resetToken.usedAt = new Date().toISOString()
  saveUsers(users)
  saveResetTokens(tokens)

  return { message: 'Password updated. You can now sign in.' }
}

export function logoutSession() {
  window.localStorage.removeItem(SESSION_KEY)
  window.localStorage.removeItem(TOKEN_KEY)
}
