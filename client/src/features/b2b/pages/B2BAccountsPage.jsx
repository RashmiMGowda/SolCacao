import { useLocalization } from '../../localization/hooks/useLocalization'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { approveBusiness, listBusinessAccounts } from '../services/requestService'
import '../b2b.css'
export default function B2BAccountsPage() {
  const { t } = useLocalization()
  const label = value => t('b2b.messages')[value] || value
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState('')
  const [reasons, setReasons] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { let active = true; listBusinessAccounts().then(items => { if (active) setAccounts(items) }).catch(() => { if (active) setError(t('b2b.messages')['Unable to complete the request. Please try again.']) }); return () => { active = false } }, [t])
  async function review(id, status) {
    setBusy(true); setError('')
    try { const next = await approveBusiness(id, status, reasons[id] || ''); setAccounts(current => current.map(item => item.id === id ? next : item)) }
    catch { setError(t('b2b.messages')['Unable to complete the request. Please try again.']) }
    finally { setBusy(false) }
  }
  return <main className="b2b-page"><div className="b2b-wrap"><Link className="b2b-back" to="/business/manage">← {label('Manage Requests')}</Link><h1 className="b2b-wizard-title">{label("Business Account Review")}</h1>{error && <p className="b2b-error" role="alert">{t('b2b.messages')['Unable to complete the request. Please try again.']}</p>}<div className="b2b-request-list">{accounts.map(account => <section className="b2b-request-card" key={account.id}><span className="b2b-status">{label(account.corporatePartner?.approvalStatus)}</span><h2>{account.corporatePartner?.companyName}</h2><p>{account.firstName} {account.lastName} · {account.email}</p><p>{account.corporatePartner?.industry}</p><div className="b2b-field"><label htmlFor={`reason-${account.id}`}>{label("Reason if rejected")}</label><textarea id={`reason-${account.id}`} value={reasons[account.id] || ''} maxLength={500} onChange={event => setReasons(current => ({ ...current, [account.id]: event.target.value }))} /></div><div className="b2b-actions" style={{ marginTop: 14 }}><button disabled={busy || account.corporatePartner?.approvalStatus === 'APPROVED'} className="b2b-button primary" onClick={() => review(account.id, 'APPROVED')}>{label("Approve Business")}</button><button disabled={busy || !(reasons[account.id] || '').trim()} className="b2b-button" onClick={() => review(account.id, 'REJECTED')}>{label("Reject Business")}</button></div></section>)}</div></div></main>
}
