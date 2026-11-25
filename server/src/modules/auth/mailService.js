const nodemailer = require('nodemailer')
const { env } = require('../../config/env')

let transporter = null

function getTransporter() {
  if (!env.hasSmtpConfig) return null

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    })
  }

  return transporter
}

async function sendPasswordResetEmail({ email, firstName, resetUrl }) {
  const activeTransporter = getTransporter()

  if (!activeTransporter) {
    return { sent: false, reason: 'SMTP is not configured.' }
  }

  await activeTransporter.sendMail({
    from: env.smtp.from || `SolCacao <${env.smtp.user}>`,
    to: email,
    subject: 'Reset your SolCacao password',
    text: [
      `Hello ${firstName || 'there'},`,
      '',
      'We received a request to reset your SolCacao password.',
      `Open this link to choose a new password: ${resetUrl}`,
      '',
      'This link expires in 30 minutes. If you did not request this, you can ignore this email.',
      '',
      'SolCacao Team',
    ].join('\n'),
    html: `
      <p>Hello ${firstName || 'there'},</p>
      <p>We received a request to reset your SolCacao password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
      <p>SolCacao Team</p>
    `,
  })

  return { sent: true }
}

async function sendInquiryNotification({ name, email, category, subject, message, rating, id }) {
  const activeTransporter = getTransporter()
  const recipient = env.smtp.inquiryRecipient
  if (!activeTransporter || !recipient) return { sent: false, reason: 'SMTP or inquiry recipient is not configured.' }

  await activeTransporter.sendMail({
    from: env.smtp.from || `SolCacao <${env.smtp.user}>`,
    to: recipient,
    replyTo: email,
    subject: `[SolCacao] ${category} inquiry ${id}`,
    text: [`Name: ${name}`, `Email: ${email}`, `Category: ${category}`, `Subject: ${subject}`, `Rating: ${rating ?? 'Not provided'}`, '', message].join('\n'),
  })
  return { sent: true }
}

module.exports = { sendPasswordResetEmail, sendInquiryNotification }
