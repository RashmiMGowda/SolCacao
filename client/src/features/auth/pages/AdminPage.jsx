import { useUiText } from '../../localization/hooks/useUiText'
import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../../shared/toast/useToast'
import { ProfileField } from '../components/ProfileField'
import { useAuth } from '../hooks/useAuth'
import { useLocalization } from '../../localization/hooks/useLocalization'

function formatDate(value, locale) {
  if (!value) return 'Not reviewed'

  return new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function AdminPage() {
  const ui = useUiText()
  const { locale } = useLocalization()
  const { getBusinessAccounts, reviewBusinessAccount, user } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [searchTerm, setSearchTerm] = useState('')
  const [businessAccounts, setBusinessAccounts] = useState([])
  const [rejectionReasons, setRejectionReasons] = useState({})
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState('')

  useEffect(() => {
    let isMounted = true

    getBusinessAccounts()
      .then((accounts) => {
        if (isMounted) setBusinessAccounts(accounts)
      })
      .catch((error) => {
        if (isMounted) showToast({ message: error.message, type: 'error' })
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [getBusinessAccounts, showToast])

  const stats = useMemo(() => {
    const counts = { total: businessAccounts.length, pending: 0, approved: 0, rejected: 0 }

    businessAccounts.forEach((account) => {
      const nextStatus = account.corporatePartner?.approvalStatus?.toLowerCase()
      if (nextStatus && counts[nextStatus] !== undefined) counts[nextStatus] += 1
    })

    return counts
  }, [businessAccounts])

  const visibleAccounts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return businessAccounts.filter((account) => {
      const partner = account.corporatePartner
      const matchesStatus =
        statusFilter === 'ALL' || partner?.approvalStatus === statusFilter
      const matchesSearch =
        !query ||
        partner?.companyName.toLowerCase().includes(query) ||
        account.email.toLowerCase().includes(query) ||
        `${account.firstName} ${account.lastName}`.toLowerCase().includes(query)

      return matchesStatus && matchesSearch
    })
  }, [businessAccounts, searchTerm, statusFilter])

  function updateReason(accountId, value) {
    setErrors((current) => ({ ...current, [accountId]: undefined }))
    setRejectionReasons((current) => ({ ...current, [accountId]: value }))
  }

  async function submitReview(account, approvalStatus, fallbackReason = '') {
    const reason = rejectionReasons[account.id]?.trim() || fallbackReason

    if (approvalStatus === 'REJECTED' && reason.length < 8) {
      setErrors((current) => ({
        ...current,
        [account.id]: 'Add a short rejection reason before rejecting.',
      }))
      return
    }

    try {
      setReviewingId(account.id)
      const updatedAccount = await reviewBusinessAccount(account.id, approvalStatus, reason)

      setBusinessAccounts((current) =>
        current.map((item) => (item.id === updatedAccount.id ? updatedAccount : item)),
      )
      showToast({
        message: `${account.corporatePartner.companyName} marked ${approvalStatus.toLowerCase()}.`,
        type: 'success',
      })
    } catch (error) {
      showToast({ message: error.message, type: 'error' })
      setErrors((current) => ({ ...current, [account.id]: error.message }))
    } finally {
      setReviewingId('')
    }
  }

  return (
    <main className="page-wrap dashboard-page">
      <section className="page-heading">
        <p className="eyebrow">{ui("Admin Access")}</p>
        <h1>{ui("Admin dashboard")}</h1>
        <p>{ui("Manage business accounts and site activity.")}</p>
      </section>

      <div className="dashboard-grid">
        <aside className="account-sidebar">
          <p className="eyebrow">{ui("Admin")}</p>
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('overview')}
          >
            {ui("Overview")}
          </button>
          <button
            className={activeTab === 'business-review' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('business-review')}
          >
            <span>{ui("Business approval")}</span>
            {stats.pending ? <span className="sidebar-count">{stats.pending}</span> : null}
          </button>
        </aside>

        <section className="dashboard-stack">
          {activeTab === 'overview' ? (
            <div className="panel-card" id="overview">
              <div className="panel-title-row">
                <div>
                  <h2>{ui("Welcome,")} {user.firstName}</h2>
                  <p>{ui("Review corporate registrations before they can use business-only flows.")}</p>
                </div>
                <span className="status-pill approved">{ui("ADMIN")}</span>
              </div>

              <div className="profile-grid">
                <ProfileField label={ui("Admin Email")} value={user.email} />
                <ProfileField label={ui("Role")} value={user.role} />
                <ProfileField label={ui("Total B2B")} value={stats.total} />
                <ProfileField label={ui("Pending Review")} value={stats.pending} />
              </div>
            </div>
          ) : null}

          {activeTab === 'business-review' ? (
            <div className="panel-card" id="business-review">
              <div className="panel-title-row">
                <div>
                  <h2>{ui("Business account approval")}</h2>
                  <p>{ui("Approve qualified brands or reject incomplete corporate applications.")}</p>
                </div>
              </div>

              <div className="admin-toolbar">
                <div className="admin-filter-row" role="group" aria-label={ui("Business status filter")}>
                  <button
                    className={statusFilter === 'PENDING' ? 'active' : ''}
                    aria-pressed={statusFilter === 'PENDING'}
                    type="button"
                    onClick={() => setStatusFilter('PENDING')}
                  >
                    {ui("Pending")} {stats.pending}
                  </button>
                  <button
                    className={statusFilter === 'APPROVED' ? 'active' : ''}
                    aria-pressed={statusFilter === 'APPROVED'}
                    type="button"
                    onClick={() => setStatusFilter('APPROVED')}
                  >
                    {ui("Approved")} {stats.approved}
                  </button>
                  <button
                    className={statusFilter === 'REJECTED' ? 'active' : ''}
                    aria-pressed={statusFilter === 'REJECTED'}
                    type="button"
                    onClick={() => setStatusFilter('REJECTED')}
                  >
                    {ui("Rejected")} {stats.rejected}
                  </button>
                </div>

                <label className="admin-search">
                  <span className="sr-only">{ui("Search business accounts")}</span>
                  <input
                    type="search"
                    placeholder={ui("Search company / email")}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>
              </div>

              {isLoading ? <p>{ui("Loading business accounts...")}</p> : null}

              {!isLoading && !businessAccounts.length ? (
                <p>{ui("No business registrations are available yet.")}</p>
              ) : null}

              {!isLoading && businessAccounts.length > 0 && !visibleAccounts.length ? (
                <p>{ui("No business accounts match this view.")}</p>
              ) : null}

              <div className="admin-review-list">
                {visibleAccounts.map((account) => {
                  const partner = account.corporatePartner
                  const isReviewing = reviewingId === account.id
                  const isPending = partner.approvalStatus === 'PENDING'
                  const isApproved = partner.approvalStatus === 'APPROVED'
                  const isRejected = partner.approvalStatus === 'REJECTED'

                  return (
                    <article className="admin-review-item" key={account.id}>
                      <div className="admin-review-main">
                        <div>
                          <h3>{partner.companyName}</h3>
                          <p>{account.email}</p>
                        </div>
                        <div>
                          <span>{ui("Contact")}</span>
                          <strong>{`${account.firstName} ${account.lastName}`}</strong>
                          <small>{partner.businessPhone || account.phone}</small>
                        </div>
                        <div>
                          <span>{ui("Industry")}</span>
                          <strong>{ui(partner.industry)}</strong>
                          <small>{partner.website || ui("No website")}</small>
                        </div>
                        <div>
                          <span>{isPending ? ui("Submitted") : ui("Reviewed")}</span>
                          <strong>{ui(formatDate(partner.reviewedAt, locale))}</strong>
                          <small>{(partner.rejectionReason ? ui(partner.rejectionReason) : ui("No notes"))}</small>
                        </div>
                        <span className={`status-pill ${partner.approvalStatus.toLowerCase()}`}>
                          {ui(partner.approvalStatus)}
                        </span>
                      </div>

                      {partner.approvalStatus === 'REJECTED' && partner.rejectionReason ? (
                        <p className="admin-note">{ui("Reason:")} {ui(partner.rejectionReason)}</p>
                      ) : null}

                      {isPending ? (
                        <div className="admin-review-footer">
                          <label className="form-field admin-reject-field">
                            <span>
                              {ui("Rejection reason")} <em>{ui("(only needed if you reject)")}</em>
                            </span>
                            <textarea
                              name={`rejection-${account.id}`}
                              onChange={(event) => updateReason(account.id, event.target.value)}
                              placeholder={ui("Explain what is missing or incomplete")}
                              rows="2"
                              value={rejectionReasons[account.id] || ''}
                            />
                            {errors[account.id] ? <small>{ui(errors[account.id])}</small> : null}
                          </label>

                          <div className="admin-action-row">
                            <button
                              className="btn btn-primary admin-action-button"
                              disabled={isReviewing}
                              type="button"
                              onClick={() => submitReview(account, 'APPROVED')}
                            >
                              {ui("Approve")}
                            </button>
                            <button
                              className="btn btn-outline admin-action-button danger"
                              disabled={isReviewing}
                              type="button"
                              onClick={() => submitReview(account, 'REJECTED')}
                            >
                              {ui("Reject")}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {!isPending ? (
                        <div className="admin-inline-actions">
                          {isApproved ? (
                            <button
                              disabled={isReviewing}
                              type="button"
                              onClick={() => submitReview(account, 'PENDING')}
                            >
                              {ui("Mark pending")}
                            </button>
                          ) : null}
                          {isApproved ? (
                            <button
                              className="danger-link"
                              disabled={isReviewing}
                              type="button"
                              onClick={() =>
                                submitReview(
                                  account,
                                  'REJECTED',
                                  'Rejected during admin review.',
                                )
                              }
                            >
                              {ui("Reject")}
                            </button>
                          ) : null}
                          {isRejected ? (
                            <button
                              disabled={isReviewing}
                              type="button"
                              onClick={() => submitReview(account, 'PENDING')}
                            >
                              {ui("Mark pending")}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
