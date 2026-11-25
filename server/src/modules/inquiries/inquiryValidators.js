const { HttpError } = require('../../utils/httpError')

const categories = ['GENERAL', 'B2B', 'SAMPLER', 'ORDER', 'FEEDBACK']
const limits = { name: 120, email: 254, subject: 180, message: 4000 }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateInquiry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Invalid inquiry.')
  }

  const errors = {}
  const text = (field, required = true) => {
    const raw = body[field]
    const value = typeof raw === 'string' ? raw.trim() : ''
    if ((required && !value) || (raw != null && typeof raw !== 'string')) errors[field] = 'This field is required.'
    else if (value.length > limits[field]) errors[field] = `Use no more than ${limits[field]} characters.`
    return value
  }

  const values = {
    name: text('name'),
    email: text('email'),
    category: typeof body.category === 'string' ? body.category : '',
    subject: text('subject', false),
    message: text('message'),
    rating: body.rating === '' || body.rating == null ? null : Number(body.rating),
  }

  if (values.email && !emailPattern.test(values.email)) errors.email = 'Enter a valid email address.'
  if (!categories.includes(values.category)) errors.category = 'Choose a valid category.'
  if (values.category === 'FEEDBACK') {
    if (!Number.isInteger(values.rating) || values.rating < 1 || values.rating > 5) errors.rating = 'Choose a rating from 1 to 5.'
    values.subject = 'Feedback'
  } else if (!values.subject) {
    errors.subject = 'This field is required.'
  }

  if (Object.keys(errors).length) throw new HttpError(400, 'Check your inquiry details.', errors)
  return values
}

module.exports = { categories, limits, validateInquiry }
