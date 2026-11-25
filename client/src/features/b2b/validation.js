import Joi from 'joi'
export const schemas = [
  Joi.object({ cacaoProfile: Joi.string().valid('Madagascar 55%', 'Ecuador 75%', 'Peru 80%').required(), quantityKg: Joi.number().integer().min(5).max(1000000).required() }),
  Joi.object({ brandName: Joi.string().trim().min(2).max(160).required(), designDetails: Joi.string().allow('').max(500) }),
  Joi.object({ packagingOption: Joi.string().valid('Luxury Gift Box', 'Foil Wrap', 'Event Sleeve').required(), whiteLabel: Joi.string().valid('company-branding', 'solcacao-cobranding').required(), specialInstructions: Joi.string().allow('').max(500) }),
]
