import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { useLocalization } from '../../localization/hooks/useLocalization'
export default function B2BHeader() {
 const { user } = useAuth()
 const { t } = useLocalization()
 return <nav className="b2b-toolbar" aria-label={t('b2b.navigation')}><div className="b2b-toolbar-actions">
 {user?.accountType === 'B2B' && user?.role !== 'ADMIN' && <Link to="/business/requests">{t('b2b.myRequests')}</Link>}
 {user?.role === 'ADMIN' && <Link to="/business/manage">{t('b2b.manageRequests')}</Link>}
 </div></nav>
}
