import { useUiText } from '../../localization/hooks/useUiText'
import { useState } from 'react'
import { FormField } from '../components/FormField'
import { AccountOrders } from '../components/AccountOrders'
import { useAuth } from '../hooks/useAuth'
import { validateProfile } from '../services/validators'

function AccountLine({ label, value }) {
  const ui = useUiText()
  return (
    <div className="account-line">
      <span>{ui(label)}</span>
      <strong>{value || ui("Not provided")}</strong>
    </div>
  )
}

export function ProfilePage() {
  const ui = useUiText()
  const { updateProfile, user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [status, setStatus] = useState('')
  const [errors, setErrors] = useState({})
  const defaultAddress = user.addresses?.find((item) => item.isDefault) || user.addresses?.[0]
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    street: defaultAddress?.street || '',
    city: defaultAddress?.city || '',
    state: defaultAddress?.state || '',
    postalCode: defaultAddress?.postalCode || '',
    country: defaultAddress?.country || 'United States',
  })

  function updateField(event) {
    setErrors((current) => ({ ...current, [event.target.name]: undefined }))
    setStatus('')
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submitProfile(event) {
    event.preventDefault()
    const nextErrors = validateProfile(form, 'RETAIL')
    setErrors(nextErrors)
    setStatus('')

    if (Object.keys(nextErrors).length) return

    try {
      await updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        addresses: [
          {
            id: defaultAddress?.id || `addr-${user.id}`,
            label: 'Default',
            street: form.street,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
            country: form.country,
            isDefault: true,
          },
        ],
      })
      setStatus('Profile changes saved.')
    } catch (error) {
      setStatus(error.message)
      setErrors(error.details || {})
    }
  }

  return (
    <main className="page-wrap dashboard-page">
      <section className="page-heading">
        <h1>{ui("My Account")}</h1>
      </section>

      <div className="dashboard-grid">
        <aside className="account-sidebar">
          <p className="eyebrow">{ui("My Account")}</p>
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('overview')}
          >
            {ui("Overview")}
          </button>
          <button
            className={activeTab === 'orders' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('orders')}
          >
            {ui("Orders")}
          </button>
          <button
            className={activeTab === 'addresses' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('addresses')}
          >
            {ui("Addresses")}
          </button>
        </aside>

        <section className="dashboard-stack">
          {activeTab === 'overview' ? (
            <>
              <div className="panel-card account-overview-panel" id="overview">
                <h2>{ui("Welcome,")} {user.firstName}</h2>
                <h3>{ui("Personal Information")}</h3>
                <div className="account-lines">
                  <AccountLine label={ui("Name")} value={`${user.firstName} ${user.lastName}`} />
                  <AccountLine label={ui("Email")} value={user.email} />
                  <AccountLine label={ui("Phone")} value={user.phone} />
                </div>
              </div>

              <div className="panel-card account-overview-panel" id="orders">
                <h2>{ui("Recent Orders")}</h2>
                <AccountOrders userId={user.id} recent />
              </div>
            </>
          ) : null}

          {activeTab === 'orders' ? (
            <div className="panel-card account-overview-panel" id="orders">
              <h2>{ui("Orders")}</h2>
              <AccountOrders userId={user.id} />
            </div>
          ) : null}

          {activeTab === 'addresses' ? (
            <form className="panel-card form-stack" id="address" onSubmit={submitProfile} noValidate>
              <div className="panel-title-row">
                <div>
                  <h2>{ui("Default Address")}</h2>
                  <p>{ui("Update the saved address for this customer account.")}</p>
                </div>
                {status ? <span className="success-chip">{ui(status)}</span> : null}
              </div>

              <div className="form-grid">
                <FormField
                  error={errors.firstName}
                  label={ui("First Name")}
                  name="firstName"
                  onChange={updateField}
                  value={form.firstName}
                />
                <FormField
                  error={errors.lastName}
                  label={ui("Last Name")}
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
                  label={ui("Street Address")}
                  name="street"
                  onChange={updateField}
                  required={false}
                  value={form.street}
                />
                <FormField
                  label={ui("City")}
                  name="city"
                  onChange={updateField}
                  required={false}
                  value={form.city}
                />
                <FormField
                  label={ui("State")}
                  name="state"
                  onChange={updateField}
                  required={false}
                  value={form.state}
                />
                <FormField
                  error={errors.postalCode}
                  label={ui("ZIP Code")}
                  name="postalCode"
                  onChange={updateField}
                  required={false}
                  value={form.postalCode}
                />
              </div>

              <button className="btn btn-primary" type="submit">
                {ui("Edit / Save")}
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </main>
  )
}
