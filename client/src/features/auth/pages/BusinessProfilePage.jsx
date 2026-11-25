import { useUiText } from '../../localization/hooks/useUiText'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { ProfileField } from '../components/ProfileField'
import { useAuth } from '../hooks/useAuth'
import { validateProfile } from '../services/validators'

function approvalCopy(status) {
  if (status === 'APPROVED') {
    return 'Approved for corporate quotes and custom brand requests.'
  }
  if (status === 'REJECTED') {
    return 'Needs attention before quote access can be enabled.'
  }
  return 'Pending review by SolCacao team.'
}

export function BusinessProfilePage() {
  const ui = useUiText()
  const { t } = useLocalization()
  const { updateProfile, user } = useAuth()
  const partner = user.corporatePartner || {}
  const [status, setStatus] = useState('')
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    companyName: partner.companyName,
    industry: partner.industry,
    businessPhone: partner.businessPhone,
    website: partner.website || '',
  })

  function updateField(event) {
    setErrors((current) => ({ ...current, [event.target.name]: undefined }))
    setStatus('')
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submitProfile(event) {
    event.preventDefault()
    const nextErrors = validateProfile(form, 'B2B')
    setErrors(nextErrors)
    setStatus('')

    if (Object.keys(nextErrors).length) return

    try {
      await updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        corporatePartner: {
          companyName: form.companyName,
          industry: form.industry,
          businessPhone: form.businessPhone,
          website: form.website,
          approvalStatus:
            partner.approvalStatus === 'REJECTED' ? 'PENDING' : partner.approvalStatus,
        },
      })
      setStatus('Business profile saved.')
    } catch (error) {
      setStatus(error.message)
      setErrors(error.details || {})
    }
  }

  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
  return (
    <main className="page-wrap dashboard-page">
      <section className="page-heading">
        <p className="eyebrow">{ui("Corporate Account")}</p>
        <h1>{ui("Business Account")}</h1>
      </section>

      <div className="dashboard-grid">
        <aside className="account-sidebar">
          <p className="eyebrow">{ui("Business Account")}</p>
          <a className="active" href="#overview">
            {ui("Overview")}
          </a>
          <a href="#company">{ui("Company Information")}</a>
          <Link to="/business/requests">{t('b2b.myRequests')}</Link>
          <Link to="/business/quote">{t('b2b.messages')['New Custom Request']}</Link>
        </aside>

        <section className="dashboard-stack">
          <div className="panel-card" id="overview">
            <div className="panel-title-row">
              <div>
                <h2>{partner.companyName}</h2>
                <p>{ui(approvalCopy(partner.approvalStatus))}</p>
              </div>
              <span className={`status-pill ${partner.approvalStatus.toLowerCase()}`}>
                {ui(partner.approvalStatus.replace('_', ' '))}
              </span>
            </div>
            <div className="profile-grid">
              <ProfileField label={ui("Contact")} value={`${user.firstName} ${user.lastName}`} />
              <ProfileField label={ui("Email")} value={user.email} />
              <ProfileField label={ui("Industry")} value={partner.industry} />
              <ProfileField label={ui("Website")} value={partner.website} />
            </div>

            {partner.approvalStatus === 'REJECTED' && partner.rejectionReason ? (
              <p className="admin-note">{ui("Admin note:")} {ui(partner.rejectionReason)}</p>
            ) : null}
          </div>

          <form className="panel-card form-stack" id="company" onSubmit={submitProfile} noValidate>
            <div className="panel-title-row">
              <div>
                <h2>{ui("Company Information")}</h2>
              </div>
              {status ? <span className="success-chip">{ui(status)}</span> : null}
            </div>

            <div className="form-grid">
              <FormField
                error={errors.firstName}
                label={ui("Contact First Name")}
                name="firstName"
                onChange={updateField}
                value={form.firstName}
              />
              <FormField
                error={errors.lastName}
                label={ui("Contact Last Name")}
                name="lastName"
                onChange={updateField}
                value={form.lastName}
              />
              <FormField
                error={errors.email}
                label={ui("Email")}
                name="email"
                onChange={updateField}
                type="email"
                value={form.email}
              />
              <FormField
                error={errors.phone}
                label={ui("Phone")}
                name="phone"
                onChange={updateField}
                required={false}
                value={form.phone}
              />
              <FormField
                error={errors.companyName}
                label={ui("Company Name")}
                name="companyName"
                onChange={updateField}
                value={form.companyName}
              />
              <FormField
                error={errors.industry}
                label={ui("Industry")}
                name="industry"
                onChange={updateField}
                value={form.industry}
              />
              <FormField
                error={errors.businessPhone}
                label={ui("Business Phone")}
                name="businessPhone"
                onChange={updateField}
                value={form.businessPhone}
              />
              <FormField
                error={errors.website}
                label={ui("Website")}
                name="website"
                onChange={updateField}
                required={false}
                type="url"
                value={form.website}
              />
            </div>

            <button className="btn btn-primary" type="submit">
              {ui("Save Company Profile")}
            </button>
          </form>

        </section>
      </div>
    </main>
  )
}
