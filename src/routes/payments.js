const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/errors');
const { supabase } = require('../config/database');

/**
 * POST /api/v1/payments/create-invoice
 * Create Lightning Network payment invoice
 */
router.post('/create-invoice', asyncHandler(async (req, res) => {
  const { agent_id, feature_type, amount_sats } = req.body;

  // Placeholder - integrate with LNbits later
  res.json({
    success: false,
    error: 'Payment system not yet implemented'
  });
}));

/**
 * GET /api/v1/payments/status/:invoice_id
 * Check payment status
 */
router.get('/status/:invoice_id', asyncHandler(async (req, res) => {
  const { invoice_id } = req.params;

  // Placeholder - integrate with LNbits later
  res.json({
    success: false,
    error: 'Payment system not yet implemented'
  });
}));

module.exports = router;
