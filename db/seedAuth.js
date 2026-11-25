const bcrypt = require('./runtime')('bcryptjs')
const fs = require('fs')
const path = require('path')
const { env } = require('../server/src/config/env')
const { getPool } = require('../server/src/db/mysql')

const password = 'Password123!'
const seedDataPath = path.resolve(__dirname, 'seed', 'auth_demo_users.json')
const demoUsers = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'))

async function upsertUser(connection, user, passwordHash) {
  const [existingRows] = await connection.execute('SELECT id FROM users WHERE email = ?', [user.email])
  const userId = existingRows[0]?.id || user.id

  if (existingRows.length) {
    await connection.execute(
      `UPDATE users
       SET first_name = ?, last_name = ?, password_hash = ?, phone = ?, role = ?, account_type = ?,
           preferred_language = ?, is_active = TRUE
       WHERE id = ?`,
      [
        user.firstName,
        user.lastName,
        passwordHash,
        user.phone,
        user.role,
        user.accountType,
        user.preferredLanguage,
        userId,
      ],
    )
  } else {
    await connection.execute(
      `INSERT INTO users
        (id, first_name, last_name, email, password_hash, phone, role, account_type, preferred_language, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        userId,
        user.firstName,
        user.lastName,
        user.email,
        passwordHash,
        user.phone,
        user.role,
        user.accountType,
        user.preferredLanguage,
      ],
    )
  }

  return userId
}

async function upsertAddress(connection, userId, address) {
  if (!address) return

  const [existingRows] = await connection.execute(
    'SELECT id FROM addresses WHERE user_id = ? AND label = ? LIMIT 1',
    [userId, address.label],
  )

  if (existingRows.length) {
    await connection.execute(
      `UPDATE addresses
       SET street = ?, city = ?, state = ?, postal_code = ?, country = ?, is_default = TRUE
       WHERE id = ?`,
      [address.street, address.city, address.state, address.postalCode, address.country, existingRows[0].id],
    )
  } else {
    await connection.execute(
      `INSERT INTO addresses
        (id, user_id, label, street, city, state, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        address.id,
        userId,
        address.label,
        address.street,
        address.city,
        address.state,
        address.postalCode,
        address.country,
      ],
    )
  }
}

async function upsertCorporatePartner(connection, userId, partner) {
  if (!partner) return

  await connection.execute(
    `INSERT INTO corporate_partners
      (id, user_id, company_name, industry, business_phone, website, approval_status, reviewed_at, rejection_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       company_name = VALUES(company_name),
       industry = VALUES(industry),
       business_phone = VALUES(business_phone),
       website = VALUES(website),
       approval_status = VALUES(approval_status),
       reviewed_at = VALUES(reviewed_at),
       rejection_reason = VALUES(rejection_reason)`,
    [
      partner.id,
      userId,
      partner.companyName,
      partner.industry,
      partner.businessPhone,
      partner.website,
      partner.approvalStatus,
      partner.reviewedAt || null,
      partner.rejectionReason || null,
    ],
  )
}

async function seedAuthData() {
  const pool = getPool()

  if (!pool) {
    throw new Error('MySQL is not configured. Add DB_HOST, DB_USER, and DB_NAME to .env.')
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds)
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    for (const user of demoUsers) {
      const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [user.email])
      // Seeds must never reset passwords, approval decisions or profiles on repeat runs.
      if (existing.length) continue
      const userId = await upsertUser(connection, user, passwordHash)
      await upsertAddress(connection, userId, user.address)
      await upsertCorporatePartner(connection, userId, user.corporatePartner)
    }

    await connection.commit()
    console.log('Seeded Student 1 auth demo accounts.')
    console.log('Password for all demo accounts: Password123!')
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

seedAuthData().catch((error) => {
  console.error('Database seed failed.')
  console.error(error.message)
  process.exit(1)
})
