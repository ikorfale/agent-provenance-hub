/**
 * Token Utilities
 */

const crypto = require('crypto');

/**
 * Generate a secure random token
 * 
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Hex-encoded token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate verification token with expiry
 * 
 * @param {number} expiresInHours - Token expiry in hours (default: 24)
 * @returns {Object} Token object with token and expiresAt
 */
function generateVerificationToken(expiresInHours = 24) {
  const token = generateToken(32);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  
  return {
    token,
    expiresAt: expiresAt.toISOString()
  };
}

/**
 * Generate API key
 * 
 * @param {string} prefix - Key prefix (default: 'aph')
 * @returns {string} API key
 */
function generateApiKey(prefix = 'aph') {
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${randomPart}`;
}

/**
 * Hash a string (for API key storage)
 * 
 * @param {string} value - Value to hash
 * @returns {string} SHA-256 hash
 */
function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Validate token format
 * 
 * @param {string} token - Token to validate
 * @returns {boolean} Is valid
 */
function isValidToken(token) {
  return /^[a-f0-9]{64}$/.test(token);
}

/**
 * Validate API key format
 * 
 * @param {string} apiKey - API key to validate
 * @returns {boolean} Is valid
 */
function isValidApiKey(apiKey) {
  return /^[\w-]+_[a-f0-9]{32}$/.test(apiKey);
}

module.exports = {
  generateToken,
  generateVerificationToken,
  generateApiKey,
  hashValue,
  isValidToken,
  isValidApiKey
};
