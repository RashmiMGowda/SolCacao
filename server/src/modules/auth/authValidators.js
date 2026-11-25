const allowedAccountTypes = new Set(['RETAIL', 'B2B'])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
const phonePattern = /^(?=(?:\D*\d){7,15}\D*$)[0-9+\-()\s.]+$/
const postalPattern = /^[0-9A-Za-z -]{3,12}$/
const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function validateLogin(body = {}) {
  const email = cleanString(body.email).toLowerCase()
  const password = cleanString(body.password)
  const errors = {}

  if (!emailPattern.test(email)) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  if (email.length > 255) errors.email = 'Use no more than 255 characters.'
  if (Buffer.byteLength(password, 'utf8') > 72) errors.password = 'Password must be at most 72 bytes.'

  return { values: { email, password }, errors }
}

function validateRegister(body = {}) {
  const accountType = cleanString(body.accountType || 'RETAIL').toUpperCase()
  const values = {
    accountType,
    firstName: cleanString(body.firstName),
    lastName: cleanString(body.lastName),
    email: cleanString(body.email).toLowerCase(),
    phone: cleanString(body.phone),
    password: cleanString(body.password),
    confirmPassword: cleanString(body.confirmPassword),
    preferredLanguage: cleanString(body.preferredLanguage || 'en') || 'en',
    address: {
      label: cleanString(body.address?.label || body.label || 'Default'),
      street: cleanString(body.address?.street || body.street),
      city: cleanString(body.address?.city || body.city),
      state: cleanString(body.address?.state || body.state),
      postalCode: cleanString(body.address?.postalCode || body.postalCode),
      country: cleanString(body.address?.country || body.country || 'United States'),
    },
    corporatePartner: {
      companyName: cleanString(body.corporatePartner?.companyName || body.companyName),
      industry: cleanString(body.corporatePartner?.industry || body.industry),
      businessPhone: cleanString(body.corporatePartner?.businessPhone || body.businessPhone || body.phone),
      website: cleanString(body.corporatePartner?.website || body.website),
    },
  }
  const errors = {}

  if (!allowedAccountTypes.has(accountType)) errors.accountType = 'Choose a valid account type.'
  if (values.firstName.length < 2) errors.firstName = 'First name must be at least 2 characters.'
  if (values.lastName.length < 2) errors.lastName = 'Last name must be at least 2 characters.'
  if (!emailPattern.test(values.email)) errors.email = 'Enter a valid email address.'
  if (!phonePattern.test(values.phone)) errors.phone = 'Enter a valid phone number.'
  if (!passwordPattern.test(values.password)) {
    errors.password = 'Use at least 8 characters with letters and numbers.'
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }
  if (values.address.postalCode && !postalPattern.test(values.address.postalCode)) {
    errors.postalCode = 'Enter a valid ZIP/postal code.'
  }

  if (accountType === 'B2B') {
    if (!values.corporatePartner.companyName) errors.companyName = 'Company name is required.'
    if (!values.corporatePartner.industry) errors.industry = 'Industry is required.'
    if (!values.corporatePartner.businessPhone) errors.businessPhone = 'Business phone is required.'
    if (values.corporatePartner.businessPhone && !phonePattern.test(values.corporatePartner.businessPhone)) {
      errors.businessPhone = 'Enter a valid phone number.'
    }
    if (values.corporatePartner.website && !urlPattern.test(values.corporatePartner.website)) {
      errors.website = 'Enter a valid URL starting with http:// or https://.'
    }
  }

  validateLengths(values, errors)
  return { values, errors }
}

function validateForgotPassword(body = {}) {
  const email = cleanString(body.email).toLowerCase()
  const errors = {}

  if (!emailPattern.test(email)) errors.email = 'Enter a valid email address.'
  if (email.length > 255) errors.email = 'Use no more than 255 characters.'

  return { values: { email }, errors }
}

function validateResetPassword(body = {}) {
  const values = {
    token: cleanString(body.token),
    password: cleanString(body.password),
    confirmPassword: cleanString(body.confirmPassword),
  }
  const errors = {}

  if (!values.token) errors.token = 'Reset token is required.'
  if (!passwordPattern.test(values.password)) {
    errors.password = 'Use at least 8 characters with letters and numbers.'
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  if (values.password.length > 72) errors.password = 'Use no more than 72 characters.'
  if (Buffer.byteLength(values.password, 'utf8') > 72) errors.password = 'Password must be at most 72 bytes.'
  return { values, errors }
}

function validateProfileUpdate(body = {}, accountType) {
  const values = {
    firstName: cleanString(body.firstName),
    lastName: cleanString(body.lastName),
    email: cleanString(body.email).toLowerCase(),
    phone: cleanString(body.phone),
    preferredLanguage: cleanString(body.preferredLanguage || 'en') || 'en',
    address: {
      label: cleanString(body.address?.label || 'Default'),
      street: cleanString(body.address?.street),
      city: cleanString(body.address?.city),
      state: cleanString(body.address?.state),
      postalCode: cleanString(body.address?.postalCode),
      country: cleanString(body.address?.country || 'United States'),
    },
    corporatePartner: {
      companyName: cleanString(body.corporatePartner?.companyName),
      industry: cleanString(body.corporatePartner?.industry),
      businessPhone: cleanString(body.corporatePartner?.businessPhone || body.phone),
      website: cleanString(body.corporatePartner?.website),
    },
  }
  const errors = {}

  if (values.firstName.length < 2) errors.firstName = 'First name must be at least 2 characters.'
  if (values.lastName.length < 2) errors.lastName = 'Last name must be at least 2 characters.'
  if (!emailPattern.test(values.email)) errors.email = 'Enter a valid email address.'
  if (values.phone && !phonePattern.test(values.phone)) errors.phone = 'Enter a valid phone number.'
  if (values.address.postalCode && !postalPattern.test(values.address.postalCode)) {
    errors.postalCode = 'Enter a valid ZIP/postal code.'
  }

  if (accountType === 'B2B') {
    if (!values.corporatePartner.companyName) errors.companyName = 'Company name is required.'
    if (!values.corporatePartner.industry) errors.industry = 'Industry is required.'
    if (!values.corporatePartner.businessPhone) errors.businessPhone = 'Business phone is required.'
    if (values.corporatePartner.businessPhone && !phonePattern.test(values.corporatePartner.businessPhone)) {
      errors.businessPhone = 'Enter a valid phone number.'
    }
    if (values.corporatePartner.website && !urlPattern.test(values.corporatePartner.website)) {
      errors.website = 'Enter a valid URL starting with http:// or https://.'
    }
  }

  validateLengths(values, errors)
  return { values, errors }
}

function validateBusinessApproval(body = {}) {
  const approvalStatus = cleanString(body.approvalStatus).toUpperCase()
  const rejectionReason = cleanString(body.rejectionReason)
  const errors = {}

  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(approvalStatus)) {
    errors.approvalStatus = 'Choose Approved, Rejected, or Pending.'
  }

  if (approvalStatus === 'REJECTED' && rejectionReason.length < 8) {
    errors.rejectionReason = 'Add a short rejection reason.'
  }
  if (rejectionReason.length > 500) errors.rejectionReason = 'Use no more than 500 characters.'

  return { values: { approvalStatus, rejectionReason }, errors }
}

function validateLengths(values, errors) {
  const limits = { firstName: 80, lastName: 80, email: 255, phone: 30, password: 72 }
  for (const [key, max] of Object.entries(limits)) if (values[key]?.length > max) errors[key] = `Use no more than ${max} characters.`
  for (const [key, max] of Object.entries({ label: 60, street: 255, city: 100, state: 100, postalCode: 20, country: 100 })) {
    if (values.address?.[key]?.length > max) errors[key] = `Use no more than ${max} characters.`
  }
  for (const [key, max] of Object.entries({ companyName: 160, industry: 100, businessPhone: 30, website: 255 })) {
    if (values.corporatePartner?.[key]?.length > max) errors[key] = `Use no more than ${max} characters.`
  }
  if (values.password && Buffer.byteLength(values.password, 'utf8') > 72) errors.password = 'Password must be at most 72 bytes.'
  if (!['en', 'es'].includes(values.preferredLanguage)) errors.preferredLanguage = 'Choose English or Spanish.'
}

module.exports = {
  validateBusinessApproval,
  validateForgotPassword,
  validateLogin,
  validateProfileUpdate,
  validateRegister,
  validateResetPassword,
}
