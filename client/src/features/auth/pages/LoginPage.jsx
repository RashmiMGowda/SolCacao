import { useUiText } from '../../localization/hooks/useUiText'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FormField } from '../components/FormField'
import authStatic from '../data/authStatic.json'
import { getAuthMode } from '../services/authService'
import { demoCredentials } from '../services/demoUsers'
import { useAuth } from '../hooks/useAuth'
import { validateLogin, validateRegistration } from '../services/validators'
import { getLoginDestination } from '../services/roleAccess'

const blankRegisterForm = authStatic.defaults.register

export function LoginPage() {
  const ui = useUiText()
  const [mode, setMode] = useState('login')
  const isApiMode = getAuthMode() === 'api'
  const [loginForm, setLoginForm] = useState(isApiMode ? { email: '', password: '' } : authStatic.defaults.login)
  const [registerForm, setRegisterForm] = useState(blankRegisterForm)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const accountType = registerForm.accountType

  const returnPath = useMemo(
    () => location.state?.from?.pathname,
    [location.state],
  )

  const currentRegisterFields = useMemo(() => {
    const extraFields =
      accountType === 'B2B' ? authStatic.businessFields : authStatic.retailFields

    return [...authStatic.registerFields, ...extraFields]
  }, [accountType])

  function updateLogin(event) {
    setErrors((current) => ({ ...current, [event.target.name]: undefined }))
    setMessage('')
    setLoginForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function updateRegister(event) {
    setErrors((current) => ({ ...current, [event.target.name]: undefined }))
    setMessage('')
    setRegisterForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function submitLogin(event) {
    event.preventDefault()
    const nextErrors = validateLogin(loginForm)
    setErrors(nextErrors)
    setMessage('')

    if (Object.keys(nextErrors).length) return

    try {
      setIsSubmitting(true)
      const user = await login(loginForm.email, loginForm.password)
      navigate(getLoginDestination(user, returnPath), { replace: true })
    } catch (error) {
      setMessage(error.message)
      setErrors(error.details || {})
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitRegister(event) {
    event.preventDefault()
    const nextErrors = validateRegistration(registerForm, accountType)
    setErrors(nextErrors)
    setMessage('')

    if (Object.keys(nextErrors).length) return

    try {
      setIsSubmitting(true)
      const user = await register(registerForm, accountType)
      navigate(getLoginDestination(user), { replace: true })
    } catch (error) {
      setMessage(error.message)
      setErrors(error.details || {})
    } finally {
      setIsSubmitting(false)
    }
  }

  function fillDemoLogin(email) {
    setMode('login')
    setErrors({})
    setMessage('')
    setLoginForm({ email, password: authStatic.defaults.login.password })
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setErrors({})
    setMessage('')
  }

  function optionsFor(field) {
    if (field.optionsKey) return authStatic[field.optionsKey]
    return field.options || []
  }

  function renderField(field, form, onChange) {
    return (
      <FormField
        key={field.name}
        error={errors[field.name]}
        label={field.label}
        name={field.name}
        onChange={onChange}
        options={optionsFor(field)}
        required={field.required ?? true}
        type={field.type || 'text'}
        value={form[field.name] || ''}
        autoComplete={field.autoComplete}
        placeholder={field.placeholder}
      />
    )
  }

  return (
    <main
      className={`page-wrap auth-page auth-form-shell ${
        mode === 'login' ? 'auth-login-mode' : 'auth-register-mode'
      }`}
    >
      <section className="auth-heading">
        <h1>{mode === 'login' ? ui("Welcome Back") : ui("Create Account")}</h1>
      </section>

      <section className="auth-layout auth-single-layout">
        <div className="auth-panel auth-form-card">
          <div className="tab-row" role="group" aria-label={ui("Authentication mode")}>
            <button
              className={mode === 'login' ? 'active' : ''}
              aria-pressed={mode === 'login'}
              type="button"
              onClick={() => switchMode('login')}
            >
              {ui("Sign In")}
            </button>
            <button
              className={mode === 'register' ? 'active' : ''}
              aria-pressed={mode === 'register'}
              type="button"
              onClick={() => switchMode('register')}
            >
              {ui("Create Account")}
            </button>
          </div>

          {message ? <div className="form-alert">{ui(message)}</div> : null}

          {mode === 'login' ? (
            <form className="form-stack" onSubmit={submitLogin} noValidate>
              {authStatic.loginFields.map((field) => renderField(field, loginForm, updateLogin))}
              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? ui("Signing In...") : ui("Sign In")}
                </button>
                <Link to="/forgot-password">{ui("Forgot Password?")}</Link>
              </div>
            </form>
          ) : (
            <form className="form-stack" onSubmit={submitRegister} noValidate>
              <FormField
                error={errors.accountType}
                label={ui("Account Type")}
                name="accountType"
                onChange={updateRegister}
                options={authStatic.accountTypes}
                type="select"
                value={accountType}
              />

              {currentRegisterFields.map((field) =>
                renderField(field, registerForm, updateRegister),
              )}

              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? ui("Creating Account...") : ui("Create Account")}
              </button>
            </form>
          )}

          <div className="demo-help-card">
            <strong>{ui("Demo Accounts")}</strong>
            <p>{ui("Password for all demo accounts is")} {authStatic.defaults.login.password}.</p>
            <div className="demo-list">
              {demoCredentials.map((item) => (
                <button key={item.email} type="button" onClick={() => fillDemoLogin(item.email)}>
                  <strong>{ui(item.label)}</strong>
                  <span>{item.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
