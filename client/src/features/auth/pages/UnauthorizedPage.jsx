import { useUiText } from '../../localization/hooks/useUiText'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getAccountPath } from '../services/roleAccess'

export function UnauthorizedPage() {
  const ui = useUiText()
  const { user } = useAuth()
  return (
    <main className="page-wrap narrow-page">
      <section className="panel-card">
        <h1>{ui("Access Restricted")}</h1>
        <p>{ui("This page is not available for your account. You can continue shopping or return to your account.")}</p>
        <Link className="btn btn-primary" to={getAccountPath(user)}>
          {user?.role === 'ADMIN' ? ui("Admin Dashboard") : user ? ui("My Account") : ui("Sign In")}
        </Link>{' '}
        <Link className="btn btn-soft" to="/">
          {ui("Return Home")}
        </Link>
      </section>
    </main>
  )
}
