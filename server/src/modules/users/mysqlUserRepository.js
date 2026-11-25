const { randomUUID } = require('crypto')
const { query, transaction } = require('../../db/mysql')
const {
  toCamelAddress,
  toCamelCorporatePartner,
  toCamelUser,
} = require('./userMapper')

async function hydrateUser(user) {
  if (!user) return null

  const addresses = await query('SELECT * FROM addresses WHERE user_id = :userId ORDER BY is_default DESC', {
    userId: user.id,
  })
  const corporatePartners = await query('SELECT * FROM corporate_partners WHERE user_id = :userId LIMIT 1', {
    userId: user.id,
  })

  return {
    ...user,
    addresses: addresses.map(toCamelAddress),
    corporatePartner: toCamelCorporatePartner(corporatePartners[0]),
  }
}

async function findByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = :email LIMIT 1', { email })
  return hydrateUser(toCamelUser(rows[0]))
}

async function findById(id) {
  const rows = await query('SELECT * FROM users WHERE id = :id LIMIT 1', { id })
  return hydrateUser(toCamelUser(rows[0]))
}

async function createUser(values, passwordHash) {
  return transaction(async (connection) => {
    const userId = randomUUID()
    const isB2B = values.accountType === 'B2B'
    const role = isB2B ? 'BUSINESS' : 'CUSTOMER'

    await connection.execute(
      `INSERT INTO users
        (id, first_name, last_name, email, password_hash, phone, role, account_type, preferred_language, is_active)
       VALUES
        (:id, :firstName, :lastName, :email, :passwordHash, :phone, :role, :accountType, :preferredLanguage, TRUE)`,
      {
        id: userId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        passwordHash,
        phone: values.phone || null,
        role,
        accountType: values.accountType,
        preferredLanguage: values.preferredLanguage,
      },
    )

    if (isB2B) {
      await connection.execute(
        `INSERT INTO corporate_partners
          (id, user_id, company_name, industry, business_phone, website, approval_status)
         VALUES
          (:id, :userId, :companyName, :industry, :businessPhone, :website, 'PENDING')`,
        {
          id: randomUUID(),
          userId,
          companyName: values.corporatePartner.companyName,
          industry: values.corporatePartner.industry,
          businessPhone: values.corporatePartner.businessPhone,
          website: values.corporatePartner.website || null,
        },
      )
    } else if (values.address.street || values.address.city || values.address.postalCode) {
      await connection.execute(
        `INSERT INTO addresses
          (id, user_id, label, street, city, state, postal_code, country, is_default)
         VALUES
          (:id, :userId, :label, :street, :city, :state, :postalCode, :country, TRUE)`,
        {
          id: randomUUID(),
          userId,
          label: values.address.label,
          street: values.address.street,
          city: values.address.city,
          state: values.address.state,
          postalCode: values.address.postalCode,
          country: values.address.country,
        },
      )
    }

    const rows = await connection.execute('SELECT * FROM users WHERE id = :id LIMIT 1', { id: userId })
    return toCamelUser(rows[0][0])
  }).then((user) => hydrateUser(user))
}

async function updateUserProfile(userId, values) {
  return transaction(async (connection) => {
    const [existingRows] = await connection.execute('SELECT * FROM users WHERE id = :id LIMIT 1', { id: userId })
    const existingUser = toCamelUser(existingRows[0])

    if (!existingUser) return null

    await connection.execute(
      `UPDATE users
       SET first_name = :firstName,
           last_name = :lastName,
           email = :email,
           phone = :phone,
           preferred_language = :preferredLanguage
       WHERE id = :id`,
      {
        id: userId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || null,
        preferredLanguage: values.preferredLanguage || existingUser.preferredLanguage,
      },
    )

    if (existingUser.accountType === 'RETAIL' && values.address) {
      await connection.execute('UPDATE addresses SET is_default = FALSE WHERE user_id = :userId', { userId })
      const [addressRows] = await connection.execute(
        'SELECT id FROM addresses WHERE user_id = :userId AND label = :label LIMIT 1',
        { userId, label: values.address.label || 'Default' },
      )

      if (addressRows.length) {
        await connection.execute(
          `UPDATE addresses
           SET street = :street,
               city = :city,
               state = :state,
               postal_code = :postalCode,
               country = :country,
               is_default = TRUE
           WHERE id = :id`,
          {
            id: addressRows[0].id,
            street: values.address.street,
            city: values.address.city,
            state: values.address.state,
            postalCode: values.address.postalCode,
            country: values.address.country,
          },
        )
      } else if (values.address.street || values.address.city || values.address.postalCode) {
        await connection.execute(
          `INSERT INTO addresses
            (id, user_id, label, street, city, state, postal_code, country, is_default)
           VALUES
            (:id, :userId, :label, :street, :city, :state, :postalCode, :country, TRUE)`,
          {
            id: randomUUID(),
            userId,
            label: values.address.label || 'Default',
            street: values.address.street,
            city: values.address.city,
            state: values.address.state,
            postalCode: values.address.postalCode,
            country: values.address.country,
          },
        )
      }
    }

    if (existingUser.accountType === 'B2B' && values.corporatePartner) {
      await connection.execute(
        `UPDATE corporate_partners
         SET company_name = :companyName,
             industry = :industry,
             business_phone = :businessPhone,
             website = :website,
             rejection_reason = CASE WHEN approval_status = 'REJECTED' THEN NULL ELSE rejection_reason END,
             reviewed_at = CASE WHEN approval_status = 'REJECTED' THEN NULL ELSE reviewed_at END,
             approval_status = CASE
               WHEN approval_status = 'REJECTED' THEN 'PENDING'
               ELSE approval_status
             END
         WHERE user_id = :userId`,
        {
          userId,
          companyName: values.corporatePartner.companyName,
          industry: values.corporatePartner.industry,
          businessPhone: values.corporatePartner.businessPhone,
          website: values.corporatePartner.website || null,
        },
      )
    }

    const [updatedRows] = await connection.execute('SELECT * FROM users WHERE id = :id LIMIT 1', { id: userId })
    return toCamelUser(updatedRows[0])
  }).then((user) => hydrateUser(user))
}

async function listBusinessAccounts() {
  const rows = await query(
    `SELECT *
     FROM users
     WHERE role = 'BUSINESS'
     ORDER BY created_at DESC`,
  )

  return Promise.all(rows.map((row) => hydrateUser(toCamelUser(row))))
}

async function updateBusinessApproval(userId, values) {
  await query(
    `UPDATE corporate_partners
     SET approval_status = :approvalStatus,
         reviewed_at = NOW(),
         rejection_reason = :rejectionReason
     WHERE user_id = :userId`,
    {
      userId,
      approvalStatus: values.approvalStatus,
      rejectionReason: values.approvalStatus === 'REJECTED' ? values.rejectionReason : null,
    },
  )

  return findById(userId)
}

async function savePasswordResetToken(userId, tokenHash) {
  await query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES (:id, :userId, :tokenHash, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
    {
      id: randomUUID(),
      userId,
      tokenHash,
    },
  )
}

async function findValidPasswordResetToken(tokenHash) {
  const rows = await query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = :tokenHash
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    { tokenHash },
  )

  return rows[0] || null
}

async function updatePassword(userId, passwordHash) {
  await query('UPDATE users SET password_hash = :passwordHash WHERE id = :userId', {
    userId,
    passwordHash,
  })
}

async function markPasswordResetTokenUsed(tokenHash) {
  await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = :tokenHash', {
    tokenHash,
  })
}

module.exports = {
  consumePasswordReset: async (tokenHash, passwordHash) => transaction(async (connection) => {
    const [rows] = await connection.execute(
      'SELECT * FROM password_reset_tokens WHERE token_hash = :tokenHash AND used_at IS NULL AND expires_at > NOW() FOR UPDATE', { tokenHash },
    )
    if (!rows.length) return false
    const userId = rows[0].user_id
    const [result] = await connection.execute('UPDATE users SET password_hash = :passwordHash, auth_version = auth_version + 1 WHERE id = :userId AND is_active = TRUE', { passwordHash, userId })
    if (!result.affectedRows) return false
    await connection.execute('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = :userId AND used_at IS NULL', { userId })
    return true
  }),
  setBusinessApproval: async (userId, status, reason) => {
    await query('UPDATE corporate_partners SET approval_status = :status, rejection_reason = :reason, reviewed_at = NOW() WHERE user_id = :userId', { userId, status, reason })
    return findById(userId)
  },
  createUser,
  findByEmail,
  findById,
  findValidPasswordResetToken,
  listBusinessAccounts,
  markPasswordResetTokenUsed,
  savePasswordResetToken,
  updatePassword,
  updateBusinessApproval,
  updateUserProfile,
}
