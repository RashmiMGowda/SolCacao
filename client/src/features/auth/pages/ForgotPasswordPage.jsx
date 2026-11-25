import { useUiText } from '../../localization/hooks/useUiText'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { requestPasswordReset } from '../services/authService'
import { isValidEmail } from '../services/validators'

export function ForgotPasswordPage() {
  const ui = useUiText()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setError('')
    setResetToken('')
    setIsSubmitted(false)

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }

    try {
      setIsSubmitting(true)
      const result = await requestPasswordReset(email)
      setMessage(
        result.emailSent
          ? 'Reset instructions were sent to your email.'
          : result.message,
      )
      setResetToken(result.resetToken || '')
      setIsSubmitted(true)
    } catch (requestError) {
      setError(requestError.details?.email || requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-wrap narrow-page">
      <section className="panel-card form-stack">
        <p className="eyebrow">{ui("Account Recovery")}</p>
        <h1>{ui("Forgot Password?")}</h1>
        <p>{ui("Enter your account email and we will send a secure password reset link.")}</p>
        {message ? <div className="success-banner">{ui(message)}</div> : null}
        {resetToken ? (
          <div className="form-alert">
            {ui("Email is not available in this environment. Use this development reset link:")}{' '}
            <Link to={`/reset-password?token=${encodeURIComponent(resetToken)}`}>
              {ui("Reset Password")}
            </Link>
          </div>
        ) : null}
        {!isSubmitted || resetToken ? (
          <form className="form-stack" onSubmit={submit} noValidate>
            <FormField
              autoComplete="email"
              error={ui(error)}
              label={ui("Email")}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? ui("Sending...") : ui("Send Reset Link")}
            </button>
          </form>
        ) : (
          <button className="btn btn-soft" type="button" onClick={() => setIsSubmitted(false)}>
            {ui("Try another email")}
          </button>
        )}
        <Link to="/login">{ui("Back to Sign In")}</Link>
      </section>
    </main>
  )
}
