import { useUiText } from '../../localization/hooks/useUiText'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children, allowedAccountTypes, allowedRoles }) {
  const ui = useUiText()
  const { isAuthenticated, isBootstrapping, user } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return <main className="page-wrap">{ui("Loading account...")}</main>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  if (allowedAccountTypes?.length && !allowedAccountTypes.includes(user.accountType)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
