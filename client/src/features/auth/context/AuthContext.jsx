import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getAuthMode,
  getStoredSession,
  listBusinessAccounts,
  loginWithEmail,
  logoutSession,
  registerAccount,
  updateAccount,
  updateBusinessApproval,
} from '../services/authService'
import { AuthContext } from './AuthContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const sessionVersion = useRef(0)

  const refreshSession = useCallback(async () => {
    const version = ++sessionVersion.current
    const sessionUser = await getStoredSession()
    if (version === sessionVersion.current) {
      setUser((current) => JSON.stringify(current) === JSON.stringify(sessionUser) ? current : sessionUser)
    }
    return sessionUser
  }, [])

  useEffect(() => {
    let isMounted = true

    refreshSession()
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsBootstrapping(false)
      })

    return () => {
      isMounted = false
      sessionVersion.current += 1
    }
  }, [refreshSession])

  useEffect(() => {
    const refresh = () => { refreshSession().catch(() => {}) }
    const onStorage = (event) => {
      if (!event.key || ['solcacao.users', 'solcacao.session', 'solcacao.jwt'].includes(event.key)) refresh()
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
    const interval = user?.role === 'BUSINESS' ? window.setInterval(refresh, 15000) : null
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
      if (interval) window.clearInterval(interval)
    }
  }, [refreshSession, user?.role])

  const login = useCallback(async (email, password) => {
    sessionVersion.current += 1
    const nextUser = await loginWithEmail(email, password)
    sessionVersion.current += 1
    setUser(nextUser)
    return nextUser
  }, [])

  const register = useCallback(async (values, accountType) => {
    sessionVersion.current += 1
    const nextUser = await registerAccount(values, accountType)
    sessionVersion.current += 1
    setUser(nextUser)
    return nextUser
  }, [])

  const updateProfile = useCallback(
    async (patch) => {
      if (!user) return null
      const nextUser = await updateAccount(user.id, patch)
      sessionVersion.current += 1
      setUser(nextUser)
      return nextUser
    },
    [user],
  )

  const logout = useCallback(() => {
    sessionVersion.current += 1
    logoutSession()
    setUser(null)
  }, [])

  const getBusinessAccounts = useCallback(() => listBusinessAccounts(), [])

  const reviewBusinessAccount = useCallback(
    (userId, approvalStatus, rejectionReason) =>
      updateBusinessApproval(userId, approvalStatus, rejectionReason),
    [],
  )

  const value = useMemo(
    () => ({
      user,
      authMode: getAuthMode(),
      isAuthenticated: Boolean(user),
      isBootstrapping,
      getBusinessAccounts,
      login,
      logout,
      register,
      reviewBusinessAccount,
      refreshSession,
      updateProfile,
    }),
    [
      getBusinessAccounts,
      isBootstrapping,
      login,
      logout,
      register,
      reviewBusinessAccount,
      refreshSession,
      updateProfile,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
