import { useLocalization } from '../../localization/hooks/useLocalization'
import { useRef, useState } from 'react'
import { schemas } from '../validation'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { submitRequest } from '../services/requestService'

const cacao = [['Madagascar 55%', '🍓'], ['Ecuador 75%', '🌸'], ['Peru 80%', '🌰']]
const packaging = ['Luxury Gift Box', 'Foil Wrap', 'Event Sleeve']


export default function B2BWizard() {
  const { t } = useLocalization()
  const text = t('b2b.wizard')
  const { user } = useAuth()
  const initial = () => ({ cacaoProfile: 'Madagascar 55%', quantityKg: '25', brandName: user.corporatePartner?.companyName || '', designDetails: '', designFiles: [], packagingOption: 'Luxury Gift Box', whiteLabel: 'company-branding', specialInstructions: '' })
  const [form, setForm] = useState(initial)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const requestId = useRef(null)
  const fileInput = useRef(null)
  const heading = useRef(null)
  function update(field, value) { setForm(current => ({ ...current, [field]: value })); setErrors(current => ({ ...current, [field]: null })); setMessage(''); requestId.current = null }
  function go(next) { setStep(next); setErrors({}); setMessage(''); requestAnimationFrame(() => heading.current?.focus()) }
  function validate(index) {
    const fields = [['cacaoProfile', 'quantityKg'], ['brandName', 'designDetails'], ['packagingOption', 'whiteLabel', 'specialInstructions']][index]
    const result = schemas[index].validate(Object.fromEntries(fields.map(field => [field, form[field]])), { abortEarly: false })
    if (!result.error) return true
    setErrors(Object.fromEntries(result.error.details.map(detail => [detail.path[0], detail.path[0] === 'quantityKg' ? 'quantityError' : 'invalid'])))
    return false
  }
  function chooseFile(files) {
    const selected = [...form.designFiles, ...Array.from(files)]
    if (selected.length > 5 || selected.reduce((total, file) => total + file.size, 0) > 5 * 1024 * 1024) { setErrors(current => ({ ...current, designFile: 'fileError' })); return }
    for (const file of selected) {
      if (!file) return
      if (file.size === 0 || file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/svg+xml', 'image/png', 'image/jpeg'].includes(file.type)) { setErrors(current => ({ ...current, designFile: 'fileError' })); return }
    }
    update('designFiles', selected); setErrors(current => ({ ...current, designFile: null }))
  }
  async function submit() {
    if (busy) return
    for (let index = 0; index < 3; index++) if (!validate(index)) { setStep(index); return }
    setBusy(true); setMessage('')
    try { requestId.current ||= crypto.randomUUID(); setReceipt(await submitRequest(form, requestId.current)) }
    catch (error) { setMessage(t('b2b.messages')['Unable to complete the request. Please try again.']); setErrors(Object.fromEntries(Object.keys(error.details || {}).map(key => [key, 'invalid']))) }
    finally { setBusy(false) }
  }
  function field(key, label, textarea = false) {
    const props = { id: key, value: form[key], onChange: event => update(key, event.target.value), 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `${key}-error` : undefined, maxLength: key === 'brandName' ? 160 : 500 }
    return <div className="b2b-field"><label htmlFor={key}>{label}</label>{textarea ? <textarea {...props} rows={3} /> : <input {...props} />}{errors[key] && <p id={`${key}-error`} className="b2b-error" role="alert">{text[errors[key]]}</p>}</div>
  }
  const row = (label, value) => <div className="b2b-review-row"><span>{label}</span><strong>{value || text.empty}</strong></div>
  if (receipt) return <section className="b2b-confirm" aria-live="polite"><div className="b2b-check" aria-hidden="true">✓</div><h2>{text.success}</h2><p>{text.successText}</p><div className="b2b-review">{row(t('b2b.messages.Request'), receipt.id)}{row(t('b2b.messages.Status'), t('b2b.messages')[receipt.status] || receipt.status)}{row(text.company, user.corporatePartner?.companyName)}</div><div className="b2b-actions"><Link className="b2b-button primary" to={`/business/requests/${receipt.id}`}>{text.view}</Link><button className="b2b-button" onClick={() => { setReceipt(null); setForm(initial()); requestId.current = null; go(0) }}>{text.new}</button></div></section>
  return <div className="b2b-wizard">
    <nav className="b2b-progress" aria-label={t('b2b.extra.progress')}>{text.steps.map((label, index) => <div key={label} className="b2b-progress-item"><button type="button" disabled={busy || index > step} aria-current={step === index ? 'step' : undefined} onClick={() => go(index)} className={index < step ? 'done' : index === step ? 'current' : ''}><span>{index < step ? '✓' : index + 1}</span><b>{label}</b></button>{index < 3 && <i aria-hidden="true" />}</div>)}</nav>
    <section className="b2b-wiz-card"><p className="b2b-eyebrow">{t('b2b.extra.step').replace('{step}', step + 1)}</p><h2 ref={heading} tabIndex={-1}>{text.titles[step]}</h2><p className="b2b-muted">{text.descriptions[step]}</p>
      <fieldset disabled={busy} className="b2b-fields">
        {step === 0 && <><div className="b2b-choices" role="group" aria-label={t('b2b.messages')['Cacao Profile']}>{cacao.map(([name, icon], index) => <button key={name} type="button" aria-pressed={form.cacaoProfile === name} className={form.cacaoProfile === name ? 'selected' : ''} onClick={() => update('cacaoProfile', name)}><span className="b2b-choice-icon">{icon}</span><strong>{name}</strong><small>{t('b2b.extra.cacaoDetails')[index]}</small></button>)}</div><div className="b2b-field"><label htmlFor="quantityKg">{text.quantity}</label><input id="quantityKg" type="number" min="5" max="1000000" step="1" value={form.quantityKg} onChange={event => update('quantityKg', event.target.value)} aria-invalid={Boolean(errors.quantityKg)} aria-describedby="quantity-help" /><p id="quantity-help" className={errors.quantityKg ? 'b2b-error' : 'b2b-muted'} role={errors.quantityKg ? 'alert' : undefined}>{text[errors.quantityKg] || text.minimum}</p></div></>}
        {step === 1 && <><div className="b2b-upload" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); chooseFile(event.dataTransfer.files) }}><span className="b2b-choice-icon" aria-hidden="true">↑</span><strong>{text.upload}</strong><p className="b2b-muted">{text.fileHelp}</p><input ref={fileInput} hidden type="file" multiple accept=".pdf,.svg,.png,.jpg,.jpeg" aria-label={text.choose} onChange={event => { chooseFile(event.target.files); event.target.value = '' }} /><button type="button" className="b2b-button" onClick={() => fileInput.current.click()}>{text.choose}</button>{form.designFiles.map((file, index) => <p key={index}>{file.name} <button type="button" className="b2b-text-button" onClick={() => update('designFiles', form.designFiles.filter((_, fileIndex) => fileIndex !== index))}>{text.remove}</button></p>)}{errors.designFile && <p role="alert" className="b2b-error">{text[errors.designFile]}</p>}</div>{field('brandName', text.brand)}{field('designDetails', text.design, true)}</>}
        {step === 2 && <><div className="b2b-choices" role="group" aria-label={t('b2b.messages').Packaging}>{packaging.map((name, index) => <button type="button" key={name} aria-pressed={form.packagingOption === name} className={form.packagingOption === name ? 'selected' : ''} onClick={() => update('packagingOption', name)}><strong>{t('b2b.extra.packagingNames')[index]}</strong><small>{t('b2b.extra.packagingDetails')[index]}</small></button>)}</div><div className="b2b-field"><label htmlFor="whiteLabel">{text.white}</label><select id="whiteLabel" value={form.whiteLabel} onChange={event => update('whiteLabel', event.target.value)}><option value="company-branding">{text.yes}</option><option value="solcacao-cobranding">{text.no}</option></select></div>{field('specialInstructions', text.notes, true)}</>}
        {step === 3 && <><div className="b2b-review"><h3>{'Chocolate'}</h3>{row('Cacao', form.cacaoProfile)}{row(text.quantity, `${form.quantityKg} kg`)}</div><div className="b2b-review"><h3>{t('b2b.extra.branding')}</h3>{row(text.company, user.corporatePartner?.companyName)}{row(text.brand, form.brandName)}{row(text.choose, form.designFiles.map(file => file.name).join(', ') || text.noFile)}{row(text.design, form.designDetails)}</div><div className="b2b-review"><h3>{text.steps[2]}</h3>{row(text.steps[2], t('b2b.messages')[form.packagingOption])}{row(text.white, form.whiteLabel === 'company-branding' ? text.yes : text.no)}{row(text.notes, form.specialInstructions)}</div></>}
      </fieldset>
      {message && <p role="alert" className="b2b-error">{t('b2b.messages')['Unable to complete the request. Please try again.']}</p>}
      <div className="b2b-wiz-foot">{step > 0 ? <button disabled={busy} className="b2b-button soft" onClick={() => go(step - 1)}>{text.back}</button> : <span />}{step < 3 ? <button className="b2b-button primary" onClick={() => { if (validate(step)) go(step + 1) }}>{step === 2 ? text.review : text.next}</button> : <button className="b2b-button gold" disabled={busy} onClick={submit}>{busy ? text.saving : text.submit}</button>}</div>
    </section>
  </div>
}
