const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/errors');
const { supabase } = require('../config/database');
const { generateApiKey, hashValue } = require('../utils/tokens');

/**
 * POST /api/v1/api-keys
 * Generate new API key for an agent
 */
router.post('/', asyncHandler(async (req, res) => {
  const { agent_id, name, scopes, rate_limit_per_hour } = req.body;

  // Placeholder - implement proper authentication later
  res.json({
    success: false,
    error: 'API key management not yet implemented'
  });
}));

/**
 * GET /api/v1/api-keys
 * List API keys (admin only)
 */
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: false,
    error: 'API key management not yet implemented'
  });
}));

module.exports = router;
