/**
 * Trust Score Calculator
 * Calculates trust scores based on Agent Trust Stack metrics
 */

/**
 * Calculate trust score from metrics
 * 
 * Formula:
 * TRUST_SCORE = 100 - ((PDR×0.25) + (MDR×0.25) + (Dependency_Loss×0.25) - (Reliability×0.15) - (Security×0.10))
 * 
 * @param {Object} metrics - Metrics from observability
 * @param {number} metrics.pdr - Predictive Dependency Risk (0-100, lower is better)
 * @param {number} metrics.mdr - Model Dependency Risk (0-100, lower is better)
 * @param {number} metrics.dependency_loss - Dependency Loss Score (0-100, lower is better)
 * @param {number} metrics.reliability_score - Reliability Score (0-100, higher is better)
 * @param {number} metrics.security_score - Security Score (0-100, higher is better)
 * @returns {Object} Trust score calculation result
 */
function calculateTrustScore(metrics) {
  const {
    pdr = 50,
    mdr = 50,
    dependency_loss = 50,
    reliability_score = 50,
    security_score = 50
  } = metrics;

  // Calculate weighted risk components
  const riskScore = (pdr * 0.25) + (mdr * 0.25) + (dependency_loss * 0.25);
  const benefitScore = (reliability_score * 0.15) + (security_score * 0.10);
  
  // Calculate trust score
  let trustScore = 100 - riskScore + benefitScore;
  
  // Clamp to 0-100 range
  trustScore = Math.max(0, Math.min(100, trustScore));
  
  // Round to 2 decimal places
  trustScore = Math.round(trustScore * 100) / 100;

  return {
    trust_score: trustScore,
    components: {
      pdr_contribution: pdr * 0.25,
      mdr_contribution: mdr * 0.25,
      dependency_loss_contribution: dependency_loss * 0.25,
      reliability_contribution: reliability_score * 0.15,
      security_contribution: security_score * 0.10,
      total_risk: riskScore,
      total_benefit: benefitScore
    }
  };
}

/**
 * Get trust tier from score
 * 
 * @param {number} trustScore - Trust score (0-100)
 * @returns {string} Trust tier
 */
function getTrustTier(trustScore) {
  if (trustScore >= 90) return 'platinum';
  if (trustScore >= 80) return 'gold';
  if (trustScore >= 70) return 'silver';
  if (trustScore >= 50) return 'bronze';
  return 'unverified';
}

/**
 * Get tier badge emoji
 * 
 * @param {string} tier - Trust tier
 * @returns {string} Badge emoji
 */
function getTierBadge(tier) {
  const badges = {
    platinum: '⚡',
    gold: '🥇',
    silver: '🥈',
    bronze: '🥉',
    unverified: '⚠️'
  };
  return badges[tier] || '❓';
}

/**
 * Validate metrics object
 * 
 * @param {Object} metrics - Metrics to validate
 * @returns {Object} Validation result
 */
function validateMetrics(metrics) {
  const required = ['pdr', 'mdr', 'dependency_loss', 'reliability_score', 'security_score'];
  const errors = [];

  for (const field of required) {
    if (metrics[field] === undefined || metrics[field] === null) {
      errors.push(`Missing required field: ${field}`);
    } else if (typeof metrics[field] !== 'number' || isNaN(metrics[field])) {
      errors.push(`Invalid type for ${field}: expected number`);
    } else if (metrics[field] < 0 || metrics[field] > 100) {
      errors.push(`${field} must be between 0 and 100`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate score change
 * 
 * @param {number} currentScore - Current trust score
 * @param {number} previousScore - Previous trust score
 * @returns {number} Score change (can be negative)
 */
function calculateScoreChange(currentScore, previousScore) {
  if (previousScore === null || previousScore === undefined) {
    return 0;
  }
  const change = currentScore - previousScore;
  return Math.round(change * 100) / 100;
}

/**
 * Determine if score change is significant
 * 
 * @param {number} change - Score change
 * @param {number} threshold - Significance threshold (default: 5)
 * @returns {boolean} Is change significant
 */
function isSignificantChange(change, threshold = 5) {
  return Math.abs(change) >= threshold;
}

module.exports = {
  calculateTrustScore,
  getTrustTier,
  getTierBadge,
  validateMetrics,
  calculateScoreChange,
  isSignificantChange
};
