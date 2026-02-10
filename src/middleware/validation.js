/**
 * Validation Middleware
 */

const Joi = require('joi');

/**
 * Agent registration validation schema
 */
const agentRegistrationSchema = Joi.object({
  agent_id: Joi.string()
    .pattern(/^[\w.-]+\/[\w.-]+\/[\w.-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'agent_id must be in format: org/repo/name',
      'any.required': 'agent_id is required'
    }),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().min(1).max(2000).required(),
  version: Joi.string().max(50).default('1.0.0'),
  developer_name: Joi.string().max(255).optional(),
  developer_email: Joi.string().email().required(),
  homepage_url: Joi.string().uri().allow('').optional(),
  repo_url: Joi.string().uri().allow('').optional(),
  documentation_url: Joi.string().uri().allow('').optional()
});

/**
 * Agent submission validation schema (skill.md based)
 */
const agentSubmissionSchema = Joi.object({
  skill_url: Joi.string()
    .uri()
    .pattern(/\/skill\.md$|\.md$/)
    .required()
    .messages({
      'string.pattern.base': 'skill_url must end with /skill.md or .md',
      'any.required': 'skill_url is required'
    })
});

/**
 * Quick registration validation (no email verification, for testing)
 */
const quickRegistrationSchema = Joi.object({
  skill_url: Joi.string()
    .uri()
    .pattern(/\/skill\.md$|\.md$/)
    .required()
    .messages({
      'string.pattern.base': 'skill_url must end with /skill.md or .md',
      'any.required': 'skill_url is required'
    }),
  skip_verification: Joi.boolean().default(false)
});

/**
 * Email verification validation schema
 */
const emailVerificationSchema = Joi.object({
  token: Joi.string().required(),
  email: Joi.string().email().required()
});

/**
 * Agent query validation schema
 */
const agentQuerySchema = Joi.object({
  q: Joi.string().allow('').optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

/**
 * Validation middleware factory
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body || req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request data with validated data
    if (req.method === 'GET') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
}

// Named validators for convenience
const validateAgentRegistration = validate(agentRegistrationSchema);
const validateAgentSubmission = validate(agentSubmissionSchema);
const validateEmailVerification = validate(emailVerificationSchema);
const validateAgentQuery = validate(agentQuerySchema);
const validateQuickRegistration = validate(quickRegistrationSchema);

module.exports = {
  validate,
  validateAgentRegistration,
  validateAgentSubmission,
  validateEmailVerification,
  validateAgentQuery,
  validateQuickRegistration,
  agentRegistrationSchema,
  agentSubmissionSchema,
  emailVerificationSchema,
  agentQuerySchema,
  quickRegistrationSchema
};
