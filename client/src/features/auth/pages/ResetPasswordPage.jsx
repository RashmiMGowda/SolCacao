import { useUiText } from '../../localization/hooks/useUiText'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { resetPassword } from '../services/authService'
import { validatePasswordReset } from '../services/validators'

export function ResetPasswordPage() {
  const ui = useUiText()
  const [searchParams] = useSearchParams()
  const urlToken = searchParams.get('token') || ''
  const [form, setForm] = useState({
    token: urlToken,
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    setErrors((current) => ({ ...current, [event.target.name]: undefined }))
    setMessage('')
    setMessageType('')
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = validatePasswordReset(form)
    setErrors(nextErrors)
    setMessage('')
    setMessageType('')

    if (Object.keys(nextErrors).length) return

    try {
      setIsSubmitting(true)
      const result = await resetPassword(form)
      setMessage(result.message)
      setMessageType('success')
      setIsComplete(true)
      setForm((current) => ({ ...current, password: '', confirmPassword: '' }))
    } catch (error) {
      setMessage(error.message)
      setMessageType('error')
      setErrors(error.details || {})
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-wrap narrow-page">
      <section className="panel-card form-stack">
        <p className="eyebrow">{ui("Account Recovery")}</p>
        <h1>{ui("Reset Password")}</h1>
        <p>{ui("Choose a new password for your SolCacao account.")}</p>
        {message ? (
          <div className={messageType === 'error' ? 'form-alert' : 'success-banner'}>
            {ui(message)}
          </div>
        ) : null}
        <form className="form-stack" onSubmit={submit} noValidate>
          {urlToken ? (
            <div className="info-banner">{ui("Enter your new password to complete the reset.")}</div>
          ) : (
            <FormField
              autoComplete="one-time-code"
              error={errors.token}
              label={ui("Reset Token")}
              name="token"
              onChange={updateField}
              value={form.token}
            />
          )}
          <FormField
            autoComplete="new-password"
            error={errors.password}
            label={ui("New Password")}
            name="password"
            onChange={updateField}
            type="password"
            disabled={isComplete}
            value={form.password}
          />
          <FormField
            autoComplete="new-password"
            error={errors.confirmPassword}
            label={ui("Confirm New Password")}
            name="confirmPassword"
            onChange={updateField}
            type="password"
            disabled={isComplete}
            value={form.confirmPassword}
          />
          <button className="btn btn-primary" type="submit" disabled={isSubmitting || isComplete}>
            {isSubmitting ? ui("Updating...") : ui("Update Password")}
          </button>
        </form>
        <Link to="/login">{isComplete ? ui("Continue to Sign In") : ui("Back to Sign In")}</Link>
      </section>
    </main>
  )
}
