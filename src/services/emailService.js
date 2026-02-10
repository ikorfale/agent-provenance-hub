/**
 * Email Service - AgentMail Integration
 */

require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

// Load AgentMail credentials
let agentMailApiKey;

try {
  const agentMailConfig = JSON.parse(
    fs.readFileSync('/root/config/agentmail-credentials.json', 'utf8')
  );
  agentMailApiKey = agentMailConfig.api_key;
} catch (error) {
  console.error('Error loading AgentMail credentials:', error.message);
  agentMailApiKey = process.env.AGENTMAIL_API_KEY;
}

const AGENTMAIL_API_URL = process.env.AGENTMAIL_API_URL || 'https://agentmail.example.com/api';

/**
 * Send verification email
 * 
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @param {string} agentId - Agent ID for context
 * @returns {Promise<boolean>} Success status
 */
async function sendVerificationEmail(email, token, agentId) {
  try {
    const baseUrl = process.env.HUB_BASE_URL || 'https://gerundium.sicmundus.dev';
    const verificationUrl = `${baseUrl}/api/v1/agents/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    
    const subject = 'Verify Your OpenClaw Agent';
    const body = `
Hello!

Thank you for registering your OpenClaw agent: ${agentId}

Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't register this agent, you can safely ignore this email.

---
OpenClaw Agent Registry
https://gerundium.sicmundus.dev/hub
    `.trim();

    // Send via AgentMail API
    const response = await axios.post(
      `${AGENTMAIL_API_URL}/send`,
      {
        to: email,
        subject,
        body,
        text: body
      },
      {
        headers: {
          'Authorization': `Bearer ${agentMailApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      console.log(`✅ Verification email sent to ${email}`);
      return true;
    } else {
      console.error('AgentMail API returned non-200 status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error sending verification email:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Send confirmation email (after successful verification)
 * 
 * @param {string} email - Recipient email
 * @param {string} agentId - Agent ID
 * @returns {Promise<boolean>} Success status
 */
async function sendConfirmationEmail(email, agentId) {
  try {
    const baseUrl = process.env.HUB_BASE_URL || 'https://gerundium.sicmundus.dev';
    const agentUrl = `${baseUrl}/hub?agent=${encodeURIComponent(agentId)}`;
    
    const subject = 'Your OpenClaw Agent is Verified!';
    const body = `
Hello!

Great news! Your OpenClaw agent has been verified and is now live in the registry.

Agent: ${agentId}
View your agent: ${agentUrl}

Your agent will now appear in searches and can be queried by other OpenClaw agents.

---
OpenClaw Agent Registry
https://gerundium.sicmundus.dev/hub
    `.trim();

    const response = await axios.post(
      `${AGENTMAIL_API_URL}/send`,
      {
        to: email,
        subject,
        body,
        text: body
      },
      {
        headers: {
          'Authorization': `Bearer ${agentMailApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      console.log(`✅ Confirmation email sent to ${email}`);
      return true;
    } else {
      console.error('AgentMail API returned non-200 status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error sending confirmation email:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test email service connection
 * 
 * @returns {Promise<boolean>} Success status
 */
async function testConnection() {
  try {
    // Just check if API is reachable
    const response = await axios.get(
      `${AGENTMAIL_API_URL}/health`,
      {
        headers: {
          'Authorization': `Bearer ${agentMailApiKey}`
        },
        timeout: 5000
      }
    );

    if (response.status === 200) {
      console.log('✅ Email service connection successful');
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Email service health check failed (continuing anyway):', error.message);
    return false;
  }
}

module.exports = {
  sendVerificationEmail,
  sendConfirmationEmail,
  testConnection
};
