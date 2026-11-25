import { Link, useLocation } from 'react-router-dom'
import './contactFeedbackSampler.css'
import { useLocalization } from '../localization/hooks/useLocalization'

const copy = {
  en: { eyebrow: 'Customer support', title: 'Message received', reference: 'Reference', timing: 'Thank you. Our SolCacao team will respond within 24–48 hours.', home: 'Return home', contact: 'Send another message' },
  es: { eyebrow: 'Atención al cliente', title: 'Mensaje recibido', reference: 'Referencia', timing: 'Gracias. El equipo de SolCacao responderá dentro de 24 a 48 horas.', home: 'Volver al inicio', contact: 'Enviar otro mensaje' },
}

function savedReference() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('solcacao-last-inquiry') || 'null')
    return typeof saved?.reference === 'string' ? saved.reference : ''
  } catch { return '' }
}

export default function ContactConfirmationPage() {
  const { state } = useLocation()
  const { locale } = useLocalization()
  const t = copy[locale]
  const reference = (typeof state?.reference === 'string' && state.reference) || savedReference() || 'INQ-DEMO'

  return <main className="page-wrap contact-sampler-page">
    <p className="eyebrow">{t.eyebrow}</p>
    <h1>{t.title}</h1>
    <div className="form-card success"><strong>{t.reference}: {reference}</strong><p>{t.timing}</p><div className="module-confirmation-actions"><Link className="primary-button" to="/">{t.home}</Link><Link className="secondary-button" to="/contact">{t.contact}</Link></div></div>
  </main>
}
