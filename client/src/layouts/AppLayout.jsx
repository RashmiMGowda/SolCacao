import { LanguagePreferenceSync } from '../features/localization/components/LanguagePreferenceSync'
import { useUiText } from '../features/localization/hooks/useUiText'
import { Outlet } from 'react-router-dom'
import { CartDrawer } from '../features/catalog/components/CartDrawer'
import { Footer } from './Footer'
import { Header } from './Header'

export function AppLayout() {
  const ui = useUiText()
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{ui("Skip to main content")}</a>
      <LanguagePreferenceSync />
      <Header />
      <CartDrawer />
      <div id="main-content" tabIndex={-1}>
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
