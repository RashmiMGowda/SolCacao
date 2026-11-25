import { Link } from 'react-router-dom'
import { socialLinks } from '../features/auth/data/socialLinks'
import { useLocalization } from '../features/localization/hooks/useLocalization'
import { useAuth } from '../features/auth/hooks/useAuth'
import { canSeeBusinessLinks, getAccountPath } from '../features/auth/services/roleAccess'

export function Footer() {
  const { t } = useLocalization()
  const { user } = useAuth()

  return (
    <footer className="site-footer">
      <div className={canSeeBusinessLinks(user) ? 'footer-grid' : 'footer-grid footer-grid-retail'}>
        <div>
          <Link className="brand footer-brand" to="/">
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <span>SolCacao</span>
          </Link>
          <p>{t('footer.tagline')}</p>
        </div>
        <div>
          <h2>{t('footer.shopHeading')}</h2>
          <Link to="/about">{t('nav.about')}</Link>
          <Link to="/shop">{t('nav.shop')}</Link>
          <Link to="/sampler">{t('nav.sampler')}</Link>
        </div>
        {canSeeBusinessLinks(user) && <div>
          <h2>{t('footer.businessHeading')}</h2>
          <Link to="/business">{t('nav.business')}</Link>
          <Link to={getAccountPath(user)}>{user?.role === 'ADMIN' ? t('nav.admin') : t('footer.businessAccountLink')}</Link>
        </div>}
        <div>
          <h2>{t('footer.connectHeading')}</h2>
          <a href={socialLinks.instagram.url} rel="noreferrer" target="_blank">
            {t('footer.instagram')}
          </a>
          <a href={socialLinks.whatsapp.url} rel="noreferrer" target="_blank">
            {t('footer.whatsapp')}
          </a>
          <a href={socialLinks.email.url}>{t('footer.email')}</a>
        </div>
      </div>
      <p className="copyright">{t('footer.copyright')}</p>
    </footer>
  )
}
