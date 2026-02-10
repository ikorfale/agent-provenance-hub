const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/errors');
const { supabase } = require('../config/database');
const { sendVerificationEmail, sendConfirmationEmail } = require('../services/emailService');
const { 
  validateAgentRegistration, 
  validateAgentSubmission,
  validateQuickRegistration,
  validateEmailVerification,
  validateAgentQuery 
} = require('../middleware/validation');
const { generateVerificationToken } = require('../utils/tokens');
const { fetchAndValidateSkill } = require('../services/skillParser');
const { calculateTrustScore } = require('../services/trustCalculator');

/**
 * POST /api/v1/agents/submit
 * Submit agent via skill.md URL (parses and registers)
 */
router.post('/submit', validateAgentSubmission, asyncHandler(async (req, res) => {
  const { skill_url } = req.body;

  // Fetch and parse skill.md
  const metadata = await fetchAndValidateSkill(skill_url);
  
  // Generate agent_id from name (or use provided)
  const agent_id = metadata.name.toLowerCase().replace(/\s+/g, '-');

  // Check if agent_id already exists
  const { data: existingAgent } = await supabase
    .from('agents')
    .select('id, agent_name, email_verified')
    .eq('agent_name', metadata.name)
    .maybeSingle();

  if (existingAgent) {
    return res.status(400).json({
      success: false,
      error: `Agent "${metadata.name}" is already registered`
    });
  }

  // Generate verification token
  const verificationToken = generateVerificationToken();

  // Create agent record
  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      agent_name: metadata.name,
      display_name: metadata.name,
      email: metadata.contact,
      description: metadata.description,
      homepage: metadata.homepage,
      email_verified: false,
      verification_token: verificationToken.token,
      openclaw_verified: metadata.openclaw || false,
      skill_md_url: skill_url,
      version: metadata.version,
      pdr_score: 0.5, // Default neutral score (0-1 range)
      mdr_score: 0.0, // Low distortion initially
      dependency_loss: 0.1, // Low initial dependency
      trust_score: 0.5 // Default trust score (0-1 range, displayed as percentage)
    })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register agent'
    });
  }

  // Store verification token in tokens table
  await supabase.from('verification_tokens').insert({
    agent_id: agent.id,
    email: metadata.contact,
    token: verificationToken.token,
    expires_at: verificationToken.expiresAt
  });

  // Create initial provenance event
  await supabase.from('provenance_events').insert({
    agent_id: agent.id,
    event_type: 'registration',
    data: {
      skill_url: skill_url,
      metadata: {
        version: metadata.version,
        openclaw: metadata.openclaw,
        capabilities: metadata.capabilities
      }
    }
  });

  // Send verification email
  const emailSent = await sendVerificationEmail(metadata.contact, verificationToken.token, agent_id);
  
  if (!emailSent) {
    console.warn('Failed to send verification email, but agent was registered');
  }

  res.status(201).json({
    success: true,
    data: {
      id: agent.id,
      agent_id: agent.agent_name,
      display_name: metadata.name,
      verification_token: verificationToken.token,
      is_verified: false,
      contact_email: metadata.contact,
      message: 'Agent submitted successfully! Verification email sent. Please check your inbox.'
    }
  });
}));

/**
 * POST /api/v1/agents/register-url
 * Quick registration via URL (no email verification for testing)
 */
router.post('/register-url', validateQuickRegistration, asyncHandler(async (req, res) => {
  const { skill_url, skip_verification } = req.body;

  try {
    // Fetch and parse skill.md
    console.log(`Fetching skill.md from: ${skill_url}`);
    const metadata = await fetchAndValidateSkill(skill_url);
    
    // Generate agent_id from name
    const agent_id = metadata.name.toLowerCase().replace(/\s+/g, '-');

    // Check if agent already exists
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id, agent_name')
      .eq('agent_name', metadata.name)
      .maybeSingle();

    if (existingAgent) {
      return res.status(400).json({
        success: false,
        error: `Agent "${metadata.name}" is already registered`
      });
    }

    // Create agent record (auto-verified if skip_verification is true)
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        agent_name: metadata.name,
        display_name: metadata.name,
        email: metadata.contact,
        description: metadata.description,
        homepage: metadata.homepage,
        email_verified: skip_verification,
        is_verified: skip_verification,
        openclaw_verified: metadata.openclaw || false,
        contact_methods: {
          skill_md_url: skill_url
        },
        version: metadata.version,
        pdr_score: 0.5,
        mdr_score: 0.0,
        dependency_loss: 0.1,
        trust_score: skip_verification ? 50.0 : 0.0,
        verified_at: skip_verification ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to register agent',
        details: error.message
      });
    }

    // Create initial provenance event
    await supabase.from('provenance_events').insert({
      agent_id: agent.id,
      event_type: 'registration',
      data: {
        method: 'register-url',
        skill_url: skill_url,
        skip_verification: skip_verification,
        metadata: {
          version: metadata.version,
          openclaw: metadata.openclaw,
          capabilities: metadata.capabilities
        }
      }
    });

    // Send verification email if not skipping
    if (!skip_verification) {
      const { generateVerificationToken } = require('../utils/tokens');
      const verificationToken = generateVerificationToken();

      // Update agent with verification token
      await supabase.from('agents').update({
        verification_token: verificationToken.token
      }).eq('id', agent.id);

      // Store token
      await supabase.from('verification_tokens').insert({
        agent_id: agent.id,
        email: metadata.contact,
        token: verificationToken.token,
        expires_at: verificationToken.expiresAt
      });

      // Send email
      await sendVerificationEmail(metadata.contact, verificationToken.token, agent_id);
    }

    const responseMessage = skip_verification
      ? 'Agent registered successfully! (No email verification)'
      : 'Agent registered successfully! Verification email sent.';

    res.status(201).json({
      success: true,
      data: {
        id: agent.id,
        agent_id: agent.agent_name,
        display_name: metadata.name,
        is_verified: skip_verification,
        email_verified: skip_verification,
        contact_email: metadata.contact,
        verification_token: skip_verification ? null : 'check_email',
        message: responseMessage
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to register agent',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

/**
 * POST /api/v1/agents/register
 * Register a new agent (manual registration)
 */
router.post('/register', validateAgentRegistration, asyncHandler(async (req, res) => {
  const {
    agent_id,
    name,
    description,
    version,
    developer_name,
    developer_email,
    homepage_url,
    repo_url,
    documentation_url
  } = req.body;

  // Check if agent_id already exists
  const { data: existingAgent } = await supabase
    .from('agents')
    .select('id')
    .eq('agent_id', agent_id)
    .or(`agent_name.eq.${name}`)
    .maybeSingle();

  if (existingAgent) {
    return res.status(400).json({
      success: false,
      error: 'Agent already registered'
    });
  }

  // Generate verification token
  const verificationToken = generateVerificationToken();

  // Create agent record
  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      agent_id,
      agent_name: name,
      display_name: name,
      email: developer_email,
      bio: description,
      homepage: homepage_url,
      email_verified: false,
      verification_token: verificationToken.token,
      is_verified: false,
      pdr_score: 0.5,
      mdr_score: 0.5,
      dependency_loss: 0.5,
      trust_score: 50.0
    })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register agent'
    });
  }

  // Store verification token
  await supabase.from('verification_tokens').insert({
    agent_id: agent.id,
    email: developer_email,
    token: verificationToken.token,
    expires_at: verificationToken.expiresAt
  });

  // Create initial provenance event
  await supabase.from('provenance_events').insert({
    agent_id: agent.id,
    event_type: 'registration',
    data: {
      version,
      developer_name,
      repo_url,
      documentation_url
    }
  });

  // Send verification email
  await sendVerificationEmail(developer_email, verificationToken.token, agent_id);

  res.status(201).json({
    success: true,
    data: {
      id: agent.id,
      agent_id: agent.agent_id,
      verification_token: verificationToken.token,
      is_verified: false,
      message: 'Verification email sent. Please verify your email.'
    }
  });
}));

/**
 * GET /api/v1/agents/verify
 * Verify agent email
 */
router.get('/verify', validateEmailVerification, asyncHandler(async (req, res) => {
  const { token, email } = req.query;

  // Find valid verification token
  const { data: verification, error: verificationError } = await supabase
    .from('verification_tokens')
    .select('*')
    .eq('token', token)
    .eq('email', email)
    .is('is_used', false)
    .single();

  if (verificationError || !verification) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired verification token'
    });
  }

  // Check if token is expired
  if (new Date(verification.expires_at) < new Date()) {
    return res.status(400).json({
      success: false,
      error: 'Verification token has expired'
    });
  }

  // Verify agent
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .update({
      is_verified: true,
      email_verified: true,
      verified_at: new Date().toISOString()
    })
    .eq('id', verification.agent_id)
    .select()
    .single();

  if (agentError) {
    return res.status(500).json({
      success: false,
      error: 'Failed to verify agent'
    });
  }

  // Mark token as used
  await supabase
    .from('verification_tokens')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('id', verification.id);

  // Create provenance event
  await supabase.from('provenance_events').insert({
    agent_id: agent.id,
    event_type: 'verification',
    data: {
      verified_at: new Date().toISOString()
    }
  });

  // Send confirmation email
  await sendConfirmationEmail(email, agent.agent_name);

  res.json({
    success: true,
    data: {
      agent_id: agent.agent_name || agent.agent_id,
      display_name: agent.display_name,
      is_verified: true,
      verified_at: agent.verified_at
    }
  });
}));

/**
 * GET /api/v1/agents
 * List all agents (filterable)
 */
router.get('/', validateAgentQuery, asyncHandler(async (req, res) => {
  const { q = '', limit = 20, offset = 0 } = req.query;

  let query = supabase
    .from('agents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Apply search filter
  if (q) {
    query = query.or(
      `display_name.ilike.%${q}%,agent_name.ilike.%${q}%,bio.ilike.%${q}%`
    );
  }

  // Apply pagination
  query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  const { data: agents, count, error } = await query;

  if (error) {
    console.error('Database error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch agents'
    });
  }

  res.json({
    success: true,
    data: {
      agents: agents || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

/**
 * GET /api/v1/agents/:name
 * Get specific agent with trust scores
 */
router.get('/:name', asyncHandler(async (req, res) => {
  const { name } = req.params;

  // Try to find by agent_name or display_name first
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .or(`agent_name.eq.${name},display_name.eq.${name},agent_id.eq.${name}`)
    .single();

  if (error || !agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }

  // Get recent provenance events
  const { data: events } = await supabase
    .from('provenance_events')
    .select('*')
    .eq('agent_id', agent.id)
    .order('timestamp', { ascending: false })
    .limit(5);

  // Get trust score history
  const { data: history } = await supabase
    .from('trust_score_history')
    .select('*')
    .eq('agent_id', agent.id)
    .order('timestamp', { ascending: false })
    .limit(10);

  // Mask email for privacy
  let maskedEmail = null;
  if (agent.email) {
    const [username, domain] = agent.email.split('@');
    maskedEmail = `${username.substring(0, 3)}***@${domain}`;
  }

  // Get skill_md_url from contact_methods
  const skill_md_url = agent.contact_methods?.skill_md_url || null;

  res.json({
    success: true,
    data: {
      ...agent,
      developer_email: maskedEmail,
      email: maskedEmail,
      skill_md_url,
      provenance_events: events || [],
      trust_score_history: history || []
    }
  });
}));

/**
 * POST /api/v1/agents/:id/verify
 * Email verification callback (alternative endpoint)
 */
router.post('/:id/verify', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { token, email } = req.body;

  if (!token || !email) {
    return res.status(400).json({
      success: false,
      error: 'Token and email are required'
    });
  }

  // Find valid verification token
  const { data: verification } = await supabase
    .from('verification_tokens')
    .select('*')
    .eq('token', token)
    .eq('email', email)
    .eq('agent_id', id)
    .is('is_used', false)
    .single();

  if (!verification) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired verification token'
    });
  }

  // Check if token is expired
  if (new Date(verification.expires_at) < new Date()) {
    return res.status(400).json({
      success: false,
      error: 'Verification token has expired'
    });
  }

  // Verify agent
  const { data: agent, error } = await supabase
    .from('agents')
    .update({
      is_verified: true,
      email_verified: true,
      verified_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to verify agent'
    });
  }

  // Mark token as used
  await supabase
    .from('verification_tokens')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('id', verification.id);

  // Create provenance event
  await supabase.from('provenance_events').insert({
    agent_id: agent.id,
    event_type: 'verification',
    data: {
      verified_at: new Date().toISOString()
    }
  });

  // Send confirmation email
  await sendConfirmationEmail(email, agent.agent_name);

  res.json({
    success: true,
    data: {
      agent_id: agent.agent_name || agent.agent_id,
      is_verified: true,
      verified_at: agent.verified_at
    }
  });
}));

module.exports = router;
