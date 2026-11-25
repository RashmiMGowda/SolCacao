import { useUiText } from '../features/localization/hooks/useUiText'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useCart } from '../features/catalog/hooks/useCart'
import { LanguageToggle } from '../features/localization/components/LanguageToggle'
import { useLocalization } from '../features/localization/hooks/useLocalization'
import { canSeeBusinessLinks, getAccountPath } from '../features/auth/services/roleAccess'

function Logo({ onNavigate }) {
  return (
    <Link className="brand" to="/" onClick={onNavigate}>
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      <span>SolCacao</span>
    </Link>
  )
}

export function Header() {
  const ui = useUiText()
  const [isOpen, setIsOpen] = useState(false)
  const { isAuthenticated, logout, user } = useAuth()
  const { itemCount, openCart } = useCart()
  const { t } = useLocalization()
  const navigate = useNavigate()
  const menuButtonRef = useRef(null)

  useEffect(() => {
    function dismiss(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    const desktop = window.matchMedia('(min-width: 941px)')
    const closeOnDesktop = () => { if (desktop.matches) setIsOpen(false) }
    document.addEventListener('keydown', dismiss)
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      document.removeEventListener('keydown', dismiss)
      desktop.removeEventListener('change', closeOnDesktop)
    }
  }, [])

  const isAdmin = user?.role === 'ADMIN'
  const profilePath = getAccountPath(user)
  const showBusiness = canSeeBusinessLinks(user)
  const accountLabel = isAdmin
    ? t('nav.admin')
    : user?.accountType === 'B2B'
      ? t('nav.businessAccount')
      : t('nav.myAccount')

  async function handleLogout() {
    logout()
    setIsOpen(false)
    navigate('/login')
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo onNavigate={() => setIsOpen(false)} />

        <nav className="desktop-nav" aria-label={ui("Primary navigation")}>
          <NavLink to="/">{t('nav.home')}</NavLink>
          <NavLink to="/about">{t('nav.about')}</NavLink>
          <NavLink to="/shop">{t('nav.shop')}</NavLink>
          <NavLink to="/sampler">{t('nav.sampler')}</NavLink>
          {showBusiness && <NavLink to="/business">{t('nav.business')}</NavLink>}
          <NavLink to="/contact">{t('nav.contact')}</NavLink>
        </nav>

        <div className="header-actions">
          <LanguageToggle />

          <button
            className="cart-button"
            type="button"
            onClick={() => { setIsOpen(false); openCart() }}
          >
            <ShoppingBag size={18} aria-hidden="true" />
            <span className="cart-label">{t('catalog.cart')}</span>{' '}
            <span className="cart-button-count">{itemCount}</span>
          </button>

          {isAuthenticated ? (
            <>
              <NavLink className="pill-link" to={profilePath}>
                {accountLabel}
              </NavLink>
              <button className="btn btn-outline btn-small" type="button" onClick={handleLogout}>
                {t('nav.signOut')}
              </button>
            </>
          ) : (
            <NavLink className="btn btn-soft btn-small" to="/login">
              {t('nav.login')}
            </NavLink>
          )}

          <button
            className="icon-button menu-toggle"
            ref={menuButtonRef}
            type="button"
            aria-label={ui("Toggle navigation")}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsOpen((value) => !value)}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label={ui("Mobile navigation")}>
          <NavLink to="/" onClick={() => setIsOpen(false)}>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/about" onClick={() => setIsOpen(false)}>
            {t('nav.about')}
          </NavLink>
          <NavLink to="/shop" onClick={() => setIsOpen(false)}>
            {t('nav.shop')}
          </NavLink>
          <NavLink to="/sampler" onClick={() => setIsOpen(false)}>
            {t('nav.sampler')}
          </NavLink>
          {showBusiness && <NavLink to="/business" onClick={() => setIsOpen(false)}>
            {t('nav.business')}
          </NavLink>}
          <NavLink to="/contact" onClick={() => setIsOpen(false)}>
            {t('nav.contact')}
          </NavLink>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              openCart()
            }}
          >
            {t('catalog.cart')} ({itemCount})
          </button>
          {isAuthenticated ? (
            <>
              <NavLink to={profilePath} onClick={() => setIsOpen(false)}>
                {accountLabel}
              </NavLink>
              <button type="button" onClick={handleLogout}>
                {t('nav.signOut')}
              </button>
            </>
          ) : (
            <NavLink to="/login" onClick={() => setIsOpen(false)}>
              {t('nav.login')}
            </NavLink>
          )}
        </nav>
      )}
    </header>
  )
}
