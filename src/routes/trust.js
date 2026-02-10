const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/errors');
const { supabase } = require('../config/database');
const { calculateTrustScore, getTrustTier, getTierBadge } = require('../services/trustCalculator');

/**
 * GET /api/v1/trust/:agent_id
 * Get trust score for an agent
 */
router.get('/:agent_id', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;

  // Find agent
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .or(`agent_name.eq.${agent_id},agent_id.eq.${agent_id}`)
    .single();

  if (error || !agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }

  // Calculate trust score from stored metrics
  const trustScore = calculateTrustScore({
    pdr: agent.pdr_score * 100,
    mdr: agent.mdr_score * 100,
    dependency_loss: agent.dependency_loss * 100,
    reliability_score: 50, // Placeholder - will come from observability
    security_score: 50 // Placeholder - will come from observability
  });

  const tier = getTrustTier(trustScore.trust_score);
  const badge = getTierBadge(tier);

  // Get previous score from history
  const { data: previousHistory } = await supabase
    .from('trust_score_history')
    .select('*')
    .eq('agent_id', agent.id)
    .order('timestamp', { ascending: false })
    .limit(1);

  const previousScore = previousHistory && previousHistory[0] 
    ? previousHistory[0].trust_score * 100 
    : null;

  const scoreChange = previousScore 
    ? trustScore.trust_score - previousScore 
    : 0;

  res.json({
    success: true,
    data: {
      agent_id: agent.agent_name || agent.agent_id,
      trust_score: trustScore.trust_score,
      tier,
      badge,
      pdr: agent.pdr_score * 100,
      mdr: agent.mdr_score * 100,
      dependency_loss: agent.dependency_loss * 100,
      calculated_at: new Date().toISOString(),
      previous_score: previousScore,
      score_change,
      components: trustScore.components
    }
  });
}));

/**
 * POST /api/v1/trust/batch
 * Batch trust query (agent-to-agent)
 */
router.post('/batch', asyncHandler(async (req, res) => {
  const { agent_ids } = req.body;

  if (!Array.isArray(agent_ids) || agent_ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'agent_ids must be a non-empty array'
    });
  }

  // Find all agents
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .or(agent_ids.map(id => `agent_name.eq.${id},agent_id.eq.${id}`).join(','));

  if (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch agents'
    });
  }

  const results = (agents || []).map(agent => {
    const trustScore = calculateTrustScore({
      pdr: agent.pdr_score * 100,
      mdr: agent.mdr_score * 100,
      dependency_loss: agent.dependency_loss * 100,
      reliability_score: 50,
      security_score: 50
    });

    return {
      agent_id: agent.agent_name || agent.agent_id,
      trust_score: trustScore.trust_score,
      tier: getTrustTier(trustScore.trust_score),
      badge: getTierBadge(getTrustTier(trustScore.trust_score))
    };
  });

  res.json({
    success: true,
    data: {
      results,
      total: results.length
    }
  });
}));

module.exports = router;
