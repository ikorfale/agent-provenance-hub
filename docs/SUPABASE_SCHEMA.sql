-- Agent Provenance Hub Database Schema

-- Agents table
CREATE TABLE agents (
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
  website TEXT,
  contact_methods JSONB, -- {agentmail, twitter, github, etc}
  
  -- Trust Metrics
  pdr_score DECIMAL(5,4), -- Promise-Delivery Rate (0-1)
  mdr_score DECIMAL(5,4), -- Memory Distortion Rate (0-1)
  dependency_loss DECIMAL(5,4), -- Dependency loss metric (0-1)
  trust_score DECIMAL(5,4), -- Composite trust score
  
  -- Provenance
  provenance_chain JSONB, -- Array of provenance events
  
  -- Premium
  tier TEXT DEFAULT 'free', -- free, premium, enterprise
  premium_until TIMESTAMP
);

-- Provenance Events table
CREATE TABLE provenance_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  event_type TEXT NOT NULL, -- registration, verification, metric_update, etc
  timestamp TIMESTAMP DEFAULT NOW(),
  data JSONB,
  signature TEXT -- DKIM or cryptographic proof
);

-- Trust Scores History
CREATE TABLE trust_score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  pdr_score DECIMAL(5,4),
  mdr_score DECIMAL(5,4),
  dependency_loss DECIMAL(5,4),
  trust_score DECIMAL(5,4)
);

-- Payment Records
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  amount_sats BIGINT, -- Lightning payment in satoshis
  invoice TEXT,
  paid_at TIMESTAMP,
  expires_at TIMESTAMP,
  tier TEXT -- premium, enterprise
);

-- API Keys (for agent-to-agent queries)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  key_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP,
  rate_limit INTEGER DEFAULT 100 -- queries per hour
);

-- Indexes
CREATE INDEX idx_agents_email ON agents(email);
CREATE INDEX idx_agents_agent_name ON agents(agent_name);
CREATE INDEX idx_agents_trust_score ON agents(trust_score DESC);
CREATE INDEX idx_provenance_events_agent_id ON provenance_events(agent_id);
CREATE INDEX idx_trust_score_history_agent_id ON trust_score_history(agent_id);

-- Functions
CREATE OR REPLACE FUNCTION update_agent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agents_timestamp
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION update_agent_timestamp();

-- OpenClaw-specific additions

ALTER TABLE agents ADD COLUMN openclaw_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE agents ADD COLUMN gateway_url TEXT; -- User's gateway endpoint
ALTER TABLE agents ADD COLUMN session_key TEXT; -- For verification
ALTER TABLE agents ADD COLUMN openclaw_version TEXT; -- OpenClaw version

-- Skills table
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  skill_name TEXT NOT NULL,
  skill_description TEXT,
  skill_md_url TEXT, -- Link to SKILL.md
  downloads INTEGER DEFAULT 0,
  tips_received_sats BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Traces integration (from openclaw-observability)
CREATE TABLE trace_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  trace_id TEXT NOT NULL,
  trace_data JSONB,
  imported_at TIMESTAMP DEFAULT NOW(),
  
  -- Metrics extracted from trace
  duration_ms INTEGER,
  cost_usd DECIMAL(10,6),
  success BOOLEAN,
  spans_count INTEGER
);

-- Agent capabilities (nodes, cron, tools)
CREATE TABLE agent_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  
  -- Node capabilities
  has_camera BOOLEAN DEFAULT FALSE,
  has_screen BOOLEAN DEFAULT FALSE,
  has_location BOOLEAN DEFAULT FALSE,
  
  -- Automation
  cron_jobs_count INTEGER DEFAULT 0,
  
  -- Tools enabled
  tools_enabled TEXT[], -- ['browser', 'exec', 'canvas', etc]
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_skills_agent_id ON skills(agent_id);
CREATE INDEX idx_trace_imports_agent_id ON trace_imports(agent_id);
CREATE INDEX idx_agent_capabilities_agent_id ON agent_capabilities(agent_id);
