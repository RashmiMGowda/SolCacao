function toCamelUser(row) {
  if (!row) return null

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    passwordHash: row.password_hash,
    authVersion: row.auth_version || 0,
    phone: row.phone,
    role: row.role,
    accountType: row.account_type,
    preferredLanguage: row.preferred_language,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    addresses: [],
    corporatePartner: null,
  }
}

function toCamelAddress(row) {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    street: row.street,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    isDefault: Boolean(row.is_default),
  }
}

function toCamelCorporatePartner(row) {
  if (!row) return null

  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    industry: row.industry,
    businessPhone: row.business_phone,
    website: row.website,
    approvalStatus: row.approval_status,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
  }
}

function publicUser(user) {
  if (!user) return null

  const { passwordHash, passwordResetTokens, ...safeUser } = user
  return safeUser
}

module.exports = {
  publicUser,
  toCamelAddress,
  toCamelCorporatePartner,
  toCamelUser,
}
