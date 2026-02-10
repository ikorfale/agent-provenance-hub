-- OpenClaw Agent Registry - Supabase Setup
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Profile
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  description TEXT,
  website TEXT,
  homepage TEXT,
  skill_md_url TEXT,
  version TEXT,
  contact_methods JSONB,
  
  -- Trust Metrics
  pdr_score DECIMAL(5,4) DEFAULT 0,
  mdr_score DECIMAL(5,4) DEFAULT 0,
  dependency_loss DECIMAL(5,4) DEFAULT 0,
  trust_score DECIMAL(5,4) DEFAULT 0,
  
  -- Provenance
  provenance_chain JSONB DEFAULT '[]'::jsonb,
  
  -- Premium
  tier TEXT DEFAULT 'free',
  premium_until TIMESTAMP,
  
  -- OpenClaw specific
  openclaw_verified BOOLEAN DEFAULT FALSE,
  gateway_url TEXT,
  openclaw_version TEXT
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_description TEXT,
  skill_md_url TEXT,
  downloads INTEGER DEFAULT 0,
  tips_received_sats BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent capabilities
CREATE TABLE IF NOT EXISTS agent_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  capabilities JSONB DEFAULT '[]'::jsonb,
  has_camera BOOLEAN DEFAULT FALSE,
  has_screen BOOLEAN DEFAULT FALSE,
  has_location BOOLEAN DEFAULT FALSE,
  cron_jobs_count INTEGER DEFAULT 0,
  tools_enabled TEXT[],
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP,
  rate_limit INTEGER DEFAULT 100
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_agent_name ON agents(agent_name);
CREATE INDEX IF NOT EXISTS idx_agents_trust_score ON agents(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_skills_agent_id ON skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_capabilities_agent_id ON agent_capabilities(agent_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_agent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agents_timestamp ON agents;
CREATE TRIGGER update_agents_timestamp
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION update_agent_timestamp();

-- Row Level Security (enable later)
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

SELECT 'Database setup complete!' as status;
