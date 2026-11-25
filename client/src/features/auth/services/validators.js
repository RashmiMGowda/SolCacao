import Joi from 'joi'
import { PHONE_PATTERN, POSTAL_PATTERN } from '../../../shared/validation.js'

const messages = {
  'any.only': '{{#label}} does not match.',
  'any.required': '{{#label}} is required.',
  'string.base': '{{#label}} is required.',
  'string.empty': '{{#label}} is required.',
  'string.email': 'Enter a valid email address.',
  'string.min': '{{#label}} must be at least {{#limit}} characters.',
  'string.pattern.base': '{{#label}} is not valid.',
  'string.uri': 'Enter a valid URL starting with http:// or https://.',
}

const phoneSchema = Joi.string()
  .trim()
  .pattern(PHONE_PATTERN)
  .messages({ 'string.pattern.base': 'Enter a valid phone number.' })

const optionalPhoneSchema = phoneSchema.allow('')

const postalSchema = Joi.string()
  .trim()
  .pattern(POSTAL_PATTERN)
  .allow('')
  .messages({ 'string.pattern.base': 'Enter a valid ZIP/postal code.' })

const passwordSchema = Joi.string()
  .pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
  .required()
  .messages({
    'any.required': 'Password is required.',
    'string.empty': 'Password is required.',
    'string.pattern.base': 'Use at least 8 characters with letters and numbers.',
  })

const loginSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: false }).required().messages(messages),
  password: Joi.string().required().messages({
    'any.required': 'Password is required.',
    'string.empty': 'Password is required.',
  }),
})

const registrationBaseSchema = {
  accountType: Joi.string().valid('RETAIL', 'B2B').required().messages({
    'any.only': 'Choose a valid account type.',
  }),
  firstName: Joi.string().trim().min(2).required().messages({
    'any.required': 'First name is required.',
    'string.empty': 'First name is required.',
    'string.min': 'First name must be at least 2 characters.',
  }),
  lastName: Joi.string().trim().min(2).required().messages({
    'any.required': 'Last name is required.',
    'string.empty': 'Last name is required.',
    'string.min': 'Last name must be at least 2 characters.',
  }),
  email: Joi.string().trim().email({ tlds: false }).required().messages(messages),
  phone: phoneSchema.required().messages({
    'any.required': 'Phone is required.',
    'string.empty': 'Phone is required.',
    'string.pattern.base': 'Enter a valid phone number.',
  }),
  password: passwordSchema,
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match.',
    'any.required': 'Confirm password is required.',
    'string.empty': 'Confirm password is required.',
  }),
  street: Joi.string().trim().allow(''),
  city: Joi.string().trim().allow(''),
  state: Joi.string().trim().allow(''),
  postalCode: postalSchema,
  country: Joi.string().trim().allow(''),
}

const retailRegistrationSchema = Joi.object(registrationBaseSchema)

const businessRegistrationSchema = Joi.object({
  ...registrationBaseSchema,
  companyName: Joi.string().trim().required().messages({
    'any.required': 'Company name is required.',
    'string.empty': 'Company name is required.',
  }),
  industry: Joi.string().trim().required().messages({
    'any.required': 'Industry is required.',
    'string.empty': 'Industry is required.',
  }),
  website: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .allow('')
    .messages(messages),
})

const retailProfileSchema = Joi.object({
  firstName: Joi.string().trim().required().messages({
    'any.required': 'First name is required.',
    'string.empty': 'First name is required.',
  }),
  lastName: Joi.string().trim().required().messages({
    'any.required': 'Last name is required.',
    'string.empty': 'Last name is required.',
  }),
  email: Joi.string().trim().email({ tlds: false }).required().messages(messages),
  phone: optionalPhoneSchema.messages({
    'string.pattern.base': 'Enter a valid phone number.',
  }),
  street: Joi.string().trim().allow(''),
  city: Joi.string().trim().allow(''),
  state: Joi.string().trim().allow(''),
  postalCode: postalSchema,
  country: Joi.string().trim().allow(''),
})

const businessProfileSchema = retailProfileSchema.keys({
  companyName: Joi.string().trim().required().messages({
    'any.required': 'Company name is required.',
    'string.empty': 'Company name is required.',
  }),
  industry: Joi.string().trim().required().messages(messages),
  businessPhone: phoneSchema.required().messages({
    'string.pattern.base': 'Enter a valid phone number.',
  }),
  website: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .allow('')
    .messages(messages),
})

function validateWithSchema(schema, values) {
  const result = schema.validate(values, {
    abortEarly: false,
    allowUnknown: true,
  })

  if (!result.error) return {}

  return result.error.details.reduce((errors, detail) => {
    const field = detail.path[0]

    if (!errors[field]) {
      errors[field] = detail.message.replaceAll('"', '')
    }

    return errors
  }, {})
}

function registrationSchemaFor(accountType) {
  if (accountType === 'B2B') {
    return businessRegistrationSchema
  }

  return retailRegistrationSchema
}

export function isValidEmail(email) {
  return !Joi.string().trim().email({ tlds: false }).required().validate(email).error
}

export function validateLogin(values) {
  return validateWithSchema(loginSchema, values)
}

export function validateRegistration(values, accountType) {
  return validateWithSchema(registrationSchemaFor(accountType), {
    ...values,
    accountType,
  })
}

export function validateProfile(values, accountType) {
  return validateWithSchema(
    accountType === 'B2B' ? businessProfileSchema : retailProfileSchema,
    values,
  )
}

export function validatePasswordReset(values) {
  return validateWithSchema(
    Joi.object({
      token: Joi.string().trim().required().messages({
        'any.required': 'Reset token is required.',
        'string.empty': 'Reset token is required.',
      }),
      password: passwordSchema,
      confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match.',
        'any.required': 'Confirm password is required.',
        'string.empty': 'Confirm password is required.',
      }),
    }),
    values,
  )
}
