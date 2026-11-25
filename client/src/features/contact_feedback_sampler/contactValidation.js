export const CONTACT_LIMITS = { name: 120, email: 254, subject: 180, message: 4000 }
export const GIFT_MESSAGE_LIMIT = 500

export function validateContact(form) {
  const errors = {}
  for (const field of ['name', 'email', 'message']) {
    if (!form[field]?.trim()) errors[field] = 'required'
  }
  if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'email'
  for (const [field, limit] of Object.entries(CONTACT_LIMITS)) {
    if (field === 'subject' && form.category === 'FEEDBACK') continue
    if (form[field]?.length > limit) errors[field] = 'tooLong'
  }
  if (!['GENERAL', 'B2B', 'SAMPLER', 'ORDER', 'FEEDBACK'].includes(form.category)) errors.category = 'required'
  if (form.category === 'FEEDBACK') {
    if (!['1', '2', '3', '4', '5'].includes(String(form.rating))) errors.rating = 'rating'
  } else if (!form.subject?.trim()) errors.subject = 'required'
  return errors
}
