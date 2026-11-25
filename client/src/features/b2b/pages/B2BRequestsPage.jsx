import { useLocalization } from '../../localization/hooks/useLocalization'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { changeRequest, downloadAttachment, getRequest, listRequests } from '../services/requestService'
import '../b2b.css'

const statusName = status => status.toLowerCase().replaceAll('_', ' ').replace(/^./, character => character.toUpperCase())
export default function B2BRequestsPage({ admin = false }) {
  const { t, locale } = useLocalization()
  const label = value => t('b2b.messages')[value] || value
  const money = cents => new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
  const historyNote = event => {
    const key = { SUBMITTED: 'submittedNote', UNDER_REVIEW: 'reviewNote', ACCEPTED: 'respondedNote', DECLINED: 'respondedNote' }[event.status]
    if (key) return t(`b2b.extra.${key}`)
    const match = /^Quote (.+) issued: USD ([\d.]+), valid until (.+)\.$/.exec(event.notes || '')
    return match ? t('b2b.extra.quoteNote').replace('{number}', match[1]).replace('{amount}', match[2]).replace('{date}', new Date(match[3]).toLocaleString(locale)) : event.notes
  }
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState('')
  const [expiry, setExpiry] = useState('')
  const [notes, setNotes] = useState('')
  const base = admin ? '/business/manage' : '/business/requests'
  const load = useCallback(async () => {
    try { setData(id ? await getRequest(id) : await listRequests()); setError('') }
    catch { setError(t('b2b.messages')['Unable to complete the request. Please try again.']) }
  }, [id, t])
  useEffect(() => { let active = true; (id ? getRequest(id) : listRequests()).then(value => { if (active) { setData(value); setError('') } }).catch(() => { if (active) { setData(null); setError(t('b2b.messages')['Unable to complete the request. Please try again.']) } }); return () => { active = false } }, [id, t])
  async function action(name, values) {
    setBusy(true); setError('')
    try { setData(await changeRequest(id, name, values)) }
    catch { setError(t('b2b.messages')['Unable to complete the request. Please try again.']) }
    finally { setBusy(false) }
  }
  const row = (title, value) => <div className="b2b-review-row"><span>{title}</span><strong>{value || label('Not provided')}</strong></div>
  return <main className="b2b-page"><div className="b2b-wrap">
    <Link className="b2b-back" to={id ? base : '/business'}>← {id ? admin ? label('Manage Requests') : label('My Requests') : label('B2B Services')}</Link>
    <h1 className="b2b-wizard-title">{id ? label('Request Detail') : admin ? label('Business Requests') : label('My Requests')}</h1>
    <div className="b2b-actions" style={{ marginBottom: 20 }}><button className="b2b-button" onClick={load}>{label("Refresh")}</button>{!admin && <Link className="b2b-button primary" to="/business/quote">{label("New Custom Request")}</Link>}{admin && <Link className="b2b-button" to="/business/accounts">{label("Business Account Review")}</Link>}</div>
    {error && <p className="b2b-error" role="alert">{t('b2b.messages')['Unable to complete the request. Please try again.']}</p>}
    {!data && !error && <p role="status">{label("Loading requests…")}</p>}
    <div className="b2b-request-list">
      {Array.isArray(data) && (data.length ? data.map(item => <article className="b2b-request-card" key={item.id}><span className="b2b-status">{label(statusName(item.status))}</span><h2>{item.brandName}</h2><p>{item.cacaoProfile} · {item.quantityKg} kg</p><p>{new Date(item.createdAt).toLocaleString(locale === 'es' ? 'es-US' : 'en-US')}</p><Link className="b2b-button" to={`${base}/${item.id}`}>{label("View Request")}</Link></article>) : <p>{label("No requests yet.")}</p>)}
      {data && !Array.isArray(data) && <>
        <section className="b2b-request-card"><span className="b2b-status">{label(statusName(data.status))}</span><h2>{data.brandName}</h2>{row(label('Request'), data.id)}{row(label('Submitted'), new Date(data.createdAt).toLocaleString(locale === 'es' ? 'es-US' : 'en-US'))}{row(label('Cacao Profile'), data.cacaoProfile)}{row(label('Quantity'), `${data.quantityKg} kg`)}{row(label('Brand / Campaign Name'), data.brandName)}{row(label('Custom Mold / Design'), data.designDetails)}{row(label('Packaging'), label(data.packagingOption))}{row(label('White Label'), data.whiteLabel === 'company-branding' ? label('Company branding') : label('SolCacao co-branding'))}{row(label('Special Instructions'), data.specialInstructions)}<h3>{label("Attachments")}</h3>{data.files?.length ? data.files.map(file => <button className="b2b-text-button" key={file.id} onClick={() => downloadAttachment(id, file).catch(() => setError(t('b2b.messages')['Unable to complete the request. Please try again.']))}>{file.originalFilename} ({Math.ceil(file.fileSizeBytes / 1024)} KB)</button>) : <p>{label("No attachments")}</p>}<h3>{label("Status History")}</h3><ol className="b2b-timeline">{data.history?.map((event, index) => <li key={index}>{label(statusName(event.status))} · {new Date(event.changedAt).toLocaleString(locale === 'es' ? 'es-US' : 'en-US')}<p>{historyNote(event)}</p></li>)}</ol></section>
        {data.quote && <section className="b2b-request-card"><h2>{label("Manufacturing Quote")}</h2>{row(label('Quote Number'), data.quote.number)}{row(label('Amount (USD)'), money(data.quote.amountCents))}{row(label('Valid Until'), new Date(data.quote.validUntil).toLocaleString(locale === 'es' ? 'es-US' : 'en-US'))}{row(label('Owner Notes'), data.quote.notes)}{row(label('Status'), data.quote.status === 'SENT' ? t('b2b.extra.sent') : label(statusName(data.quote.status)))}{!admin && data.status === 'QUOTED' && <div className="b2b-actions"><button disabled={busy || new Date(data.quote.validUntil) < new Date()} className="b2b-button primary" onClick={() => action('respond', { decision: 'ACCEPTED' })}>{label("Accept Quote")}</button><button disabled={busy || new Date(data.quote.validUntil) < new Date()} className="b2b-button" onClick={() => action('respond', { decision: 'DECLINED' })}>{label("Decline Quote")}</button><Link to="/contact">{label("Contact SolCacao")}</Link></div>}{data.status === 'QUOTED' && new Date(data.quote.validUntil) < new Date() && <p>{label("This quote has expired. Contact SolCacao for an updated quote.")}</p>}</section>}
        {admin && (['SUBMITTED', 'UNDER_REVIEW'].includes(data.status) || (data.status === 'QUOTED' && new Date(data.quote?.validUntil) <= new Date())) && <section className="b2b-request-card"><h2>{label("Review and Send Quote")}</h2>{data.status === 'SUBMITTED' && <button disabled={busy} className="b2b-button" onClick={() => action('review')}>{label("Mark Under Review")}</button>}<form onSubmit={event => { event.preventDefault(); const date = new Date(`${expiry}T23:59:59`); if (!Number.isFinite(date.getTime())) { setError(label('Choose a valid expiry date.')); return } action('quote', { amountCents: Math.round(Number(amount) * 100), validUntil: date.toISOString(), notes }) }}><div className="b2b-field"><label htmlFor="quote-amount">{label("Amount (USD)")}</label><input id="quote-amount" type="number" required min="0.01" max="21474836.47" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></div><div className="b2b-field"><label htmlFor="quote-expiry">{label("Valid Until")}</label><input id="quote-expiry" required type="date" value={expiry} onChange={event => setExpiry(event.target.value)} /></div><div className="b2b-field"><label htmlFor="quote-notes">{label("Owner Notes")}</label><textarea id="quote-notes" maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} /></div><button disabled={busy} className="b2b-button gold" style={{ marginTop: 18 }}>{busy ? label('Sending…') : label('Send Quote')}</button></form></section>}
      </>}
    </div>
  </div></main>
}
