const { HttpError } = require('../../utils/httpError')

const MAX_FILE_BYTES = 5 * 1024 * 1024
const cacaoProfiles = ['Madagascar 55%', 'Ecuador 75%', 'Peru 80%']
const packagingTypes = ['Luxury Gift Box', 'Foil Wrap', 'Event Sleeve']
const brandingTypes = ['company-branding', 'solcacao-cobranding']
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateSingleRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Invalid request.')
  const errors = {}
  const text = (key, max, required = false) => {
    const value = typeof body[key] === 'string' ? body[key].trim() : ''
    if ((required && value.length < 2) || value.length > max || (body[key] != null && typeof body[key] !== 'string')) errors[key] = `Enter ${required ? '2–' : 'up to '}${max} characters.`
    return value
  }
  const values = {
    id: body.requestId,
    cacaoProfile: body.cacaoProfile,
    quantityKg: body.quantityKg,
    brandName: text('brandName', 160, true),
    designDetails: text('designDetails', 500),
    packagingOption: body.packagingOption,
    whiteLabel: body.whiteLabel,
    specialInstructions: text('specialInstructions', 500),
  }
  if (!uuid.test(values.id || '')) errors.requestId = 'Invalid request identifier.'
  if (!cacaoProfiles.includes(values.cacaoProfile)) errors.cacaoProfile = 'Select a cacao profile.'
  if (!Number.isSafeInteger(values.quantityKg) || values.quantityKg < 5 || values.quantityKg > 1000000) errors.quantityKg = 'Enter a whole-number quantity from 5 to 1,000,000 kg.'
  if (!packagingTypes.includes(values.packagingOption)) errors.packagingOption = 'Select packaging.'
  if (!brandingTypes.includes(values.whiteLabel)) errors.whiteLabel = 'Select branding.'
  if (Object.keys(errors).length) throw new HttpError(400, 'Check your request details.', errors)

  let attachment = null
  if (body.attachment != null) {
    const file = body.attachment
    if (!file || typeof file !== 'object' || typeof file.name !== 'string' || file.name.length > 255 || !file.name.trim() || /[\\/\x00-\x1f]/.test(file.name)) throw new HttpError(400, 'Invalid attachment filename.')
    // Avoid a repeated regex group: valid multi-megabyte files exhausted V8's stack.
    if (typeof file.data !== 'string' || file.data.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 || file.data.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(file.data)) throw new HttpError(400, 'Invalid attachment data.')
    const buffer = Buffer.from(file.data, 'base64')
    if (buffer.toString('base64') !== file.data) throw new HttpError(400, 'Invalid attachment data.')
    if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new HttpError(400, 'Attachments must be no larger than 5 MB.')
    const prefix = buffer.subarray(0, 1024).toString('utf8').replace(/^\uFEFF/, '').trimStart()
    const supported = {
      'application/pdf': file.name.toLowerCase().endsWith('.pdf') && prefix.startsWith('%PDF-'),
      'image/png': file.name.toLowerCase().endsWith('.png') && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/jpeg': /\.jpe?g$/i.test(file.name) && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255,
      'image/svg+xml': /\.svg$/i.test(file.name) && /^(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(prefix),
    }
    if (!supported[file.type]) throw new HttpError(400, 'Use a valid PDF, PNG, JPG or SVG attachment.')
    attachment = { originalFilename: file.name, mimeType: file.type, fileSizeBytes: buffer.length, buffer }
  }
  return { values, attachment }
}

function validateRequest(body) {
  const { values, attachment } = validateSingleRequest(body)
  if (body.attachments == null) return { values, attachments: attachment ? [attachment] : [] }
  if (!Array.isArray(body.attachments) || body.attachments.length > 5 || body.attachment != null) throw new HttpError(400, 'Choose up to five attachments.')
  const attachments = body.attachments.map(file => validateSingleRequest({ ...body, attachment: file }).attachment)
  if (attachments.some(file => !file) || attachments.reduce((total, file) => total + file.fileSizeBytes, 0) > MAX_FILE_BYTES) throw new HttpError(400, 'Attachments must total no more than 5 MB.')
  return { values, attachments }
}
module.exports = { validateRequest, MAX_FILE_BYTES, uuid }
