import { useLocalization } from '../hooks/useLocalization'
import { useUiText } from '../hooks/useUiText'

export function LanguageToggle() {
  const { locale, setLocale } = useLocalization()
  const ui = useUiText()

  return (
    <div className="lang-toggle" role="group" aria-label={ui('Language selector')}>
      <button
        type="button"
        className={`lang-toggle-btn${locale === 'en' ? ' is-active' : ''}`}
        aria-pressed={locale === 'en'}
        aria-label="EN – English"
        onClick={() => setLocale('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-toggle-btn${locale === 'es' ? ' is-active' : ''}`}
        aria-pressed={locale === 'es'}
        lang="es"
        aria-label="ES – Español"
        onClick={() => setLocale('es')}
      >
        ES
      </button>
    </div>
  )
}