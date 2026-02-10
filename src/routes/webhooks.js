const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/errors');
const { supabase } = require('../config/database');

/**
 * POST /api/v1/webhooks/payment
 * Handle LNbits payment webhook
 */
router.post('/payment', asyncHandler(async (req, res) => {
  const { payment_hash, amount, memo } = req.body;

  // Placeholder - implement payment webhook handling later
  console.log('Payment webhook received:', { payment_hash, amount, memo });
  
  res.status(200).send('OK');
}));

/**
 * POST /api/v1/webhooks/observability
 * Handle observability metrics webhook
 */
router.post('/observability', asyncHandler(async (req, res) => {
  const { agent_id, metrics } = req.body;

  // Placeholder - implement observability integration later
  console.log('Observability webhook received:', { agent_id, metrics });
  
  res.status(200).send('OK');
}));

module.exports = router;
