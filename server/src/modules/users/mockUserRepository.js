const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { env } = require('../../config/env')

const dataPath = process.env.AUTH_DATA_PATH || path.join(__dirname, '../../../data/users.json')

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

async function readUsers() {
  const raw = await fs.readFile(dataPath, 'utf8')
  return JSON.parse(raw)
}

async function writeUsers(users) {
  await fs.writeFile(dataPath, JSON.stringify(users, null, 2))
}

async function ensureSeeded() {
  const users = await readUsers()
  const passwordHash = await bcrypt.hash('Password123!', env.bcryptRounds)
  const seeded = [
    {
      id: 'usr-retail-demo',
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'customer@solcacao.test',
      passwordHash,
      phone: '555-0101',
      role: 'CUSTOMER',
      accountType: 'RETAIL',
      preferredLanguage: 'en',
      isActive: true,
      addresses: [
        {
          id: 'addr-retail-home',
          userId: 'usr-retail-demo',
          label: 'Home',
          street: '123 Main Street',
          city: 'Arlington',
          state: 'TX',
          postalCode: '76010',
          country: 'United States',
          isDefault: true,
        },
      ],
      corporatePartner: null,
    },
    {
      id: 'usr-b2b-approved',
      firstName: 'Jamie',
      lastName: 'Rivera',
      email: 'business@solcacao.test',
      passwordHash,
      phone: '555-0201',
      role: 'BUSINESS',
      accountType: 'B2B',
      preferredLanguage: 'en',
      isActive: true,
      addresses: [],
      corporatePartner: {
        id: 'corp-approved',
        userId: 'usr-b2b-approved',
        companyName: 'ABC Luxury Hotels',
        industry: 'Hotel / Hospitality',
        businessPhone: '555-0201',
        website: 'https://example.com',
        approvalStatus: 'APPROVED',
        reviewedAt: '2026-09-02',
        rejectionReason: '',
      },
    },
    {
      id: 'usr-b2b-pending',
      firstName: 'Morgan',
      lastName: 'Rivera',
      email: 'pending@solcacao.test',
      passwordHash,
      phone: '555-0202',
      role: 'BUSINESS',
      accountType: 'B2B',
      preferredLanguage: 'en',
      isActive: true,
      addresses: [],
      corporatePartner: {
        id: 'corp-pending',
        userId: 'usr-b2b-pending',
        companyName: 'Gather Events',
        industry: 'Corporate Events',
        businessPhone: '555-0202',
        website: '',
        approvalStatus: 'PENDING',
        reviewedAt: null,
        rejectionReason: '',
      },
    },
    {
      id: 'usr-b2b-boutique',
      firstName: 'Priya',
      lastName: 'Shah',
      email: 'boutique@solcacao.test',
      passwordHash,
      phone: '555-0210',
      role: 'BUSINESS',
      accountType: 'B2B',
      preferredLanguage: 'en',
      isActive: true,
      addresses: [],
      corporatePartner: {
        id: 'corp-boutique',
        userId: 'usr-b2b-boutique',
        companyName: 'Bean & Bloom Boutique',
        industry: 'Retail / Boutique',
        businessPhone: '555-0210',
        website: 'https://beanbloom.example',
        approvalStatus: 'PENDING',
        reviewedAt: null,
        rejectionReason: '',
      },
    },
    {
      id: 'usr-b2b-cafe',
      firstName: 'Mateo',
      lastName: 'Cruz',
      email: 'cafe@solcacao.test',
      passwordHash,
      phone: '555-0211',
      role: 'BUSINESS',
      accountType: 'B2B',
      preferredLanguage: 'en',
      isActive: true,
      addresses: [],
      corporatePartner: {
        id: 'corp-cafe',
        userId: 'usr-b2b-cafe',
        companyName: 'Cocoa Table Cafe',
        industry: 'Restaurant / Cafe',
        businessPhone: '555-0211',
        website: '',
        approvalStatus: 'PENDING',
        reviewedAt: null,
        rejectionReason: '',
      },
    },
    {
      id: 'usr-b2b-rejected',
      firstName: 'Taylor',
      lastName: 'Kim',
      email: 'rejected@solcacao.test',
      passwordHash,
      phone: '555-0212',
      role: 'BUSINESS',
      accountType: 'B2B',
      preferredLanguage: 'en',
      isActive: true,
      addresses: [],
      corporatePartner: {
        id: 'corp-rejected',
        userId: 'usr-b2b-rejected',
        companyName: 'Northstar Events',
        industry: 'Corporate Events',
        businessPhone: '555-0212',
        website: 'https://northstar.example',
        approvalStatus: 'REJECTED',
        reviewedAt: '2026-09-12 14:30:00',
        rejectionReason: 'Please add business phone verification and company website details.',
      },
    },
    {
      id: 'usr-admin-demo',
      firstName: 'SolCacao',
      lastName: 'Admin',
      email: 'admin@solcacao.test',
      passwordHash,
      phone: '555-0303',
      role: 'ADMIN',
      accountType: 'B2B',
      preferredLanguage: 'en',
      isActive: true,
      addresses: [],
      corporatePartner: null,
    },
  ]

  if (users.length) {
    const missingSeedUsers = seeded.filter(
      (seedUser) =>
        !users.some(
          (user) =>
            user.id === seedUser.id ||
            user.email.toLowerCase() === seedUser.email.toLowerCase(),
        ),
    )

    if (missingSeedUsers.length) {
      const mergedUsers = [...users, ...missingSeedUsers]
      await writeUsers(mergedUsers)
      return mergedUsers
    }

    return users
  }

  await writeUsers(seeded)
  return seeded
}

async function findByEmail(email) {
  const users = await ensureSeeded()
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null
}

async function findById(id) {
  const users = await ensureSeeded()
  return users.find((user) => user.id === id) || null
}

async function createUser(values, passwordHash) {
  const users = await ensureSeeded()
  const userId = createId('usr')
  const isB2B = values.accountType === 'B2B'
  const user = {
    id: userId,
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    passwordHash,
    phone: values.phone,
    role: isB2B ? 'BUSINESS' : 'CUSTOMER',
    accountType: values.accountType,
    preferredLanguage: values.preferredLanguage,
    isActive: true,
    addresses: isB2B
      ? []
      : [
          {
            id: createId('addr'),
            userId,
            label: values.address.label,
            street: values.address.street,
            city: values.address.city,
            state: values.address.state,
            postalCode: values.address.postalCode,
            country: values.address.country,
            isDefault: true,
          },
        ],
    corporatePartner: isB2B
      ? {
          id: createId('corp'),
          userId,
          companyName: values.corporatePartner.companyName,
          industry: values.corporatePartner.industry,
          businessPhone: values.corporatePartner.businessPhone,
          website: values.corporatePartner.website,
          approvalStatus: 'PENDING',
          reviewedAt: null,
          rejectionReason: '',
        }
      : null,
  }

  users.push(user)
  await writeUsers(users)
  return user
}

async function updateUserProfile(userId, values) {
  const users = await ensureSeeded()
  const index = users.findIndex((user) => user.id === userId)

  if (index === -1) return null

  const current = users[index]
  users[index] = {
    ...current,
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone || '',
    preferredLanguage: values.preferredLanguage || current.preferredLanguage,
  }

  if (current.accountType === 'RETAIL' && values.address) {
    users[index].addresses = [
      {
        id: current.addresses?.[0]?.id || createId('addr'),
        userId,
        label: values.address.label || 'Default',
        street: values.address.street,
        city: values.address.city,
        state: values.address.state,
        postalCode: values.address.postalCode,
        country: values.address.country,
        isDefault: true,
      },
    ]
  }

  if (current.accountType === 'B2B' && values.corporatePartner) {
    users[index].corporatePartner = {
      ...current.corporatePartner,
      companyName: values.corporatePartner.companyName,
      industry: values.corporatePartner.industry,
      businessPhone: values.corporatePartner.businessPhone,
      website: values.corporatePartner.website,
      approvalStatus:
        current.corporatePartner?.approvalStatus === 'REJECTED'
          ? 'PENDING'
          : current.corporatePartner?.approvalStatus || 'PENDING',
      rejectionReason:
        current.corporatePartner?.approvalStatus === 'REJECTED'
          ? ''
          : current.corporatePartner?.rejectionReason || '',
    }
  }

  await writeUsers(users)
  return users[index]
}

async function listBusinessAccounts() {
  const users = await ensureSeeded()

  return users.filter((user) => user.role === 'BUSINESS')
}

async function updateBusinessApproval(userId, values) {
  const users = await ensureSeeded()
  const index = users.findIndex((user) => user.id === userId)

  if (index === -1 || users[index].role !== 'BUSINESS') return null

  users[index].corporatePartner = {
    ...users[index].corporatePartner,
    approvalStatus: values.approvalStatus,
    reviewedAt: new Date().toISOString(),
    rejectionReason: values.approvalStatus === 'REJECTED' ? values.rejectionReason : '',
  }

  await writeUsers(users)
  return users[index]
}

async function savePasswordResetToken(userId, tokenHash, expiresAt) {
  const users = await ensureSeeded()
  const user = users.find((item) => item.id === userId)

  if (!user) return

  user.passwordResetTokens = [
    ...(user.passwordResetTokens || []),
    {
      tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date().toISOString(),
    },
  ]

  await writeUsers(users)
}

async function findValidPasswordResetToken(tokenHash) {
  const users = await ensureSeeded()
  const now = Date.now()

  for (const user of users) {
    const token = (user.passwordResetTokens || []).find(
      (item) => item.tokenHash === tokenHash && !item.usedAt && Date.parse(item.expiresAt) > now,
    )

    if (token) return { ...token, user_id: user.id }
  }

  return null
}

async function updatePassword(userId, passwordHash) {
  const users = await ensureSeeded()
  const user = users.find((item) => item.id === userId)

  if (!user) return

  user.passwordHash = passwordHash
  await writeUsers(users)
}

async function markPasswordResetTokenUsed(tokenHash) {
  const users = await ensureSeeded()

  for (const user of users) {
    const token = (user.passwordResetTokens || []).find((item) => item.tokenHash === tokenHash)
    if (token) token.usedAt = new Date().toISOString()
  }

  await writeUsers(users)
}

let resetQueue = Promise.resolve()
module.exports = {
  consumePasswordReset: (tokenHash, passwordHash) => {
    const result = resetQueue.then(async () => {
      const users = await ensureSeeded()
      const user = users.find(item => item.isActive && (item.passwordResetTokens || []).some(token => token.tokenHash === tokenHash && !token.usedAt && Date.parse(token.expiresAt) > Date.now()))
      if (!user) return false
      user.passwordHash = passwordHash
      user.authVersion = (user.authVersion || 0) + 1
      for (const token of user.passwordResetTokens || []) token.usedAt = new Date().toISOString()
      await writeUsers(users)
      return true
    })
    resetQueue = result.catch(() => {})
    return result
  },
  setBusinessApproval: async (userId, status, reason) => {
    const users = await ensureSeeded()
    const user = users.find(value => value.id === userId && value.role === 'BUSINESS')
    if (!user) return null
    user.corporatePartner.approvalStatus = status
    user.corporatePartner.rejectionReason = reason
    user.corporatePartner.reviewedAt = new Date().toISOString()
    await writeUsers(users)
    return user
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
