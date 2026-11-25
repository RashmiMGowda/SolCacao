import { useLocalization } from '../../localization/hooks/useLocalization'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { Fragment, useEffect, useState } from 'react'
export default function BusinessGate({ children, admin = false }) {
  const { t } = useLocalization()
  const label = value => t('b2b.messages')[value] || value
  const { user, isBootstrapping, refreshSession } = useAuth()
  const location = useLocation()
  const [checkedPath, setCheckedPath] = useState('')
  const [refreshFailed, setRefreshFailed] = useState(false)
  useEffect(() => {
    let active = true
    refreshSession()
      .then(() => { if (active) setRefreshFailed(false) })
      .catch(() => { if (active) setRefreshFailed(true) })
      .finally(() => { if (active) setCheckedPath(location.pathname) })
    return () => { active = false }
  }, [refreshSession, location.pathname])
  if (isBootstrapping || checkedPath !== location.pathname) return <main className="page-wrap">{label("Loading account…")}</main>
  if (refreshFailed) return <main className="page-wrap"><p role="alert">{label('Unable to complete the request. Please try again.')}</p><button className="btn btn-outline" onClick={() => window.location.reload()}>{label('Refresh')}</button></main>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (admin ? user.role !== 'ADMIN' : user.role !== 'BUSINESS' || user.accountType !== 'B2B') return <Navigate to="/unauthorized" replace />
  if (!admin && user.corporatePartner?.approvalStatus !== 'APPROVED') return <main className="page-wrap"><h1>{label("Business account review")}</h1><p>{user.corporatePartner?.approvalStatus === 'REJECTED' ? label('Your business account needs additional information.') : label('Your business account is under review. Quote requests will be available once approved.')}</p>{user.corporatePartner?.rejectionReason && <p>{label(user.corporatePartner.rejectionReason)}</p>}<Link className="btn btn-outline" to="/business-profile">{label("View company information")}</Link></main>
  // Discard drafts, receipts and loaded requests when the account or request changes.
  return <Fragment key={`${user.id}:${location.pathname}`}>{children}</Fragment>
}
