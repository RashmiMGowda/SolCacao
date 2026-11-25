import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './contactFeedbackSampler.css'
import { useLocalization } from '../localization/hooks/useLocalization'
import { CONTACT_LIMITS, validateContact } from './contactValidation'
import { submitInquiry } from './inquiryService'

const initialForm = { name: '', email: '', category: 'GENERAL', subject: '', message: '', rating: '' }
const text = {
  en: { eyebrow: 'Customer support', title: 'Contact & Feedback', intro: 'Have a question about an order, a chocolate, or a custom sampler? Send us a message. No account is required.', name: 'Full name', email: 'Email address', category: 'Category', subject: 'Subject', message: 'Message', feedback: 'Your feedback', rating: 'How would you rate your experience?', chooseRating: 'Select a rating', general: 'General inquiry', b2b: 'Wholesale / B2B', sampler: 'Custom chocolate sampler', order: 'Order support', feedbackOption: 'Feedback', send: 'Submit message', sendFeedback: 'Submit feedback', submitting: 'Sending…', failed: 'We could not save your message. Please try again.', received: 'Message received', thankYou: 'Thank you. Our SolCacao team will respond within 24–48 hours.' },
  es: { eyebrow: 'Atención al cliente', title: 'Contacto y comentarios', intro: '¿Tienes una pregunta sobre un pedido, un chocolate o un surtido personalizado? Envíanos un mensaje. No necesitas una cuenta.', name: 'Nombre completo', email: 'Correo electrónico', category: 'Categoría', subject: 'Asunto', message: 'Mensaje', feedback: 'Tus comentarios', rating: '¿Cómo calificarías tu experiencia?', chooseRating: 'Selecciona una calificación', general: 'Consulta general', b2b: 'Ventas al por mayor / B2B', sampler: 'Surtido personalizado', order: 'Ayuda con pedidos', feedbackOption: 'Comentarios', send: 'Enviar mensaje', sendFeedback: 'Enviar comentarios', submitting: 'Enviando…', failed: 'No pudimos guardar tu mensaje. Inténtalo de nuevo.', received: 'Mensaje recibido', thankYou: 'Gracias. El equipo de SolCacao responderá dentro de 24 a 48 horas.' },
}

export default function ContactFeedbackPage() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submissionError, setSubmissionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { locale } = useLocalization()
  const navigate = useNavigate()
  const t = text[locale]
  const feedback = form.category === 'FEEDBACK'
  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setErrors((current) => ({ ...current, [event.target.name]: undefined }))
    setSubmissionError('')
  }
  const errorFor = (name) => {
    if (!errors[name]) return ''
    if (errors[name] === 'tooLong') return locale === 'es'
      ? `Usa un máximo de ${CONTACT_LIMITS[name]} caracteres.`
      : `Use no more than ${CONTACT_LIMITS[name]} characters.`
    const messages = locale === 'es'
      ? { required: 'Este campo es obligatorio.', email: 'Introduce un correo electrónico válido.', rating: 'Selecciona una calificación del 1 al 5.' }
      : { required: 'This field is required.', email: 'Enter a valid email address.', rating: 'Select a rating from 1 to 5.' }
    return messages[errors[name]]
  }
  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validateContact(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0])?.focus()
      return
    }
    setSubmitting(true)
    setSubmissionError('')
    try {
      const inquiry = await submitInquiry(form)
      try {
        sessionStorage.setItem('solcacao-last-inquiry', JSON.stringify({ reference: inquiry.reference }))
      } catch { /* Router state still carries the reference when storage is unavailable. */ }
      setForm(initialForm)
      navigate('/contact-confirmation', { state: { reference: inquiry.reference, locale } })
    } catch (error) {
      setSubmissionError(error.message || t.failed)
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="page-wrap contact-sampler-page">
    <p className="eyebrow">{t.eyebrow}</p>
    <h1>{t.title}</h1><p className="intro">{t.intro}</p>
    <form className="form-card" onSubmit={submit} noValidate>
      <div className="grid"><Field label={t.name} name="name" value={form.name} error={errorFor('name')} onChange={update} /><Field label={t.email} name="email" type="email" value={form.email} error={errorFor('email')} onChange={update} /></div>
      <label className="field">{t.category}<select name="category" value={form.category} onChange={update}><option value="GENERAL">{t.general}</option><option value="B2B">{t.b2b}</option><option value="SAMPLER">{t.sampler}</option><option value="ORDER">{t.order}</option><option value="FEEDBACK">{t.feedbackOption}</option></select></label>
      {feedback ? <label className="field">{t.rating}<select name="rating" value={form.rating} onChange={update} aria-invalid={Boolean(errors.rating)} aria-describedby={errors.rating ? 'rating-error' : undefined} required><option value="">{t.chooseRating}</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select>{errors.rating && <small id="rating-error" className="error" role="alert">{errorFor('rating')}</small>}</label> : <Field label={t.subject} name="subject" value={form.subject} error={errorFor('subject')} onChange={update} />}
      <label className="field">{feedback ? t.feedback : t.message}<textarea name="message" rows="6" value={form.message} onChange={update} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'message-error' : undefined} required />{errors.message && <small id="message-error" className="error" role="alert">{errorFor('message')}</small>}</label>
      {submissionError && <p className="error" role="alert">{submissionError}</p>}
      <button className="primary-button" type="submit" disabled={submitting}>{submitting ? t.submitting : feedback ? t.sendFeedback : t.send}</button>
    </form>
  </main>
}

function Field({ label, error, ...props }) { return <label className="field">{label}<input required aria-invalid={Boolean(error)} aria-describedby={error ? `${props.name}-error` : undefined} {...props} />{error && <small id={`${props.name}-error`} className="error" role="alert">{error}</small>}</label> }
