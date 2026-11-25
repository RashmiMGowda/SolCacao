import { useLocalization } from '../../localization/hooks/useLocalization'
import { Link } from 'react-router-dom'
import B2BHeader from '../components/B2BHeader'
import B2BWizard from '../components/B2BWizard'
import '../b2b.css'
export default function B2BWizardPage() {
  const { locale: language, t } = useLocalization()
  return <main className="b2b-page" lang={language}><div className="b2b-wrap"><B2BHeader /><Link className="b2b-back" to="/business" state={{ language }}>{t('b2b.extra.backServices')}</Link><h1 className="b2b-wizard-title">{t('b2b.extra.wizardTitle')}</h1><B2BWizard language={language} /></div></main>
}
