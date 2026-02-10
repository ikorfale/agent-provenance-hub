/**
 * Database Setup Script
 * Creates necessary tables in Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  console.log('🔧 Setting up Agent Provenance Hub database...\n');

  // Table: agents
  console.log('Creating table: agents...');
  const { error: agentsError } = await supabase.rpc('create_agents_table', {
    sql: `
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Basic Info
        agent_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(50),
        
        -- Developer Info
        developer_email VARCHAR(255),
        developer_name VARCHAR(255),
        
        -- Verification
        is_verified BOOLEAN DEFAULT FALSE,
        verified_at TIMESTAMP WITH TIME ZONE,
        verification_token VARCHAR(255),
        
        -- Metadata
        homepage_url VARCHAR(500),
        repo_url VARCHAR(500),
        documentation_url VARCHAR(500),
        
        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        is_public BOOLEAN DEFAULT TRUE,
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_verified_at TIMESTAMP WITH TIME ZONE
      );
    `
  });

  if (agentsError) {
    console.error('❌ Failed to create agents table:', agentsError.message);
  } else {
    console.log('✅ Table: agents');
  }

  // Table: trust_scores
  console.log('\nCreating table: trust_scores...');
  const { error: trustError } = await supabase.rpc('create_trust_scores_table', {
    sql: `
      CREATE TABLE IF NOT EXISTS trust_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        
        -- Core Metrics
        pdr DECIMAL(5,2),
        mdr DECIMAL(5,2),
        dependency_loss DECIMAL(5,2),
        
        -- Computed Trust Score
        trust_score DECIMAL(5,2) NOT NULL,
        
        -- Metrics Breakdown
        metrics JSONB DEFAULT '{}',
        
        -- Calculation Metadata
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        calculation_version VARCHAR(20) DEFAULT '1.0',
        data_sources TEXT[] DEFAULT ARRAY[],
        
        -- Historical Tracking
        previous_score DECIMAL(5,2),
        score_change DECIMAL(5,2)
      );
      
      CREATE INDEX IF NOT EXISTS idx_trust_agent_id ON trust_scores(agent_id);
      CREATE INDEX IF NOT EXISTS idx_trust_score ON trust_scores(trust_score);
      CREATE INDEX IF NOT EXISTS idx_calculated_at ON trust_scores(calculated_at);
    `
  });

  if (trustError) {
    console.error('❌ Failed to create trust_scores table:', trustError.message);
  } else {
    console.log('✅ Table: trust_scores');
  }

  // Table: verification_tokens
  console.log('\nCreating table: verification_tokens...');
  const { error: tokensError } = await supabase.rpc('create_verification_tokens_table', {
    sql: `
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        
        -- Token Lifecycle
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        is_used BOOLEAN DEFAULT FALSE
      );
      
      CREATE INDEX IF NOT EXISTS idx_token ON verification_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_token_email ON verification_tokens(email);
      CREATE INDEX IF NOT EXISTS idx_token_expires ON verification_tokens(expires_at);
    `
  });

  if (tokensError) {
    console.error('❌ Failed to create verification_tokens table:', tokensError.message);
  } else {
    console.log('✅ Table: verification_tokens');
  }

  // Table: transactions
  console.log('\nCreating table: transactions...');
  const { error: transactionsError } = await supabase.rpc('create_transactions_table', {
    sql: `
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        
        -- Payment Details
        invoice_id VARCHAR(255) NOT NULL,
        payment_hash VARCHAR(255) NOT NULL,
        amount_sats BIGINT NOT NULL,
        
        -- Premium Features
        feature_type VARCHAR(50),
        duration_months INTEGER DEFAULT 1,
        
        -- Payment Status
        status VARCHAR(20) DEFAULT 'pending',
        paid_at TIMESTAMP WITH TIME ZONE,
        
        -- Metadata
        lnbits_user_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_invoice ON transactions(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_transaction_agent ON transactions(agent_id);
      CREATE INDEX IF NOT EXISTS idx_transaction_status ON transactions(status);
    `
  });

  if (transactionsError) {
    console.error('❌ Failed to create transactions table:', transactionsError.message);
  } else {
    console.log('✅ Table: transactions');
  }

  // Table: api_keys
  console.log('\nCreating table: api_keys...');
  const { error: apiKeysError } = await supabase.rpc('create_api_keys_table', {
    sql: `
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        
        -- Key Details
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        key_prefix VARCHAR(10) NOT NULL,
        
        -- Key Metadata
        name VARCHAR(255),
        scopes TEXT[] DEFAULT ARRAY['read'],
        rate_limit_per_hour INTEGER DEFAULT 1000,
        
        -- Lifecycle
        is_active BOOLEAN DEFAULT TRUE,
        last_used_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        revoked_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX IF NOT EXISTS idx_key_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_apikey_agent ON api_keys(agent_id);
      CREATE INDEX IF NOT EXISTS idx_apikey_active ON api_keys(is_active);
    `
  });

  if (apiKeysError) {
    console.error('❌ Failed to create api_keys table:', apiKeysError.message);
  } else {
    console.log('✅ Table: api_keys');
  }

  // Table: trust_query_logs
  console.log('\nCreating table: trust_query_logs...');
  const { error: logsError } = await supabase.rpc('create_trust_query_logs_table', {
    sql: `
      CREATE TABLE IF NOT EXISTS trust_query_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Query Details
        requester_agent_id VARCHAR(255),
        target_agent_id UUID REFERENCES agents(id),
        
        -- Request Info
        ip_address VARCHAR(45),
        user_agent TEXT,
        api_key_id UUID REFERENCES api_keys(id),
        
        -- Response
        trust_score_returned DECIMAL(5,2),
        response_status INTEGER,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_log_target ON trust_query_logs(target_agent_id);
      CREATE INDEX IF NOT EXISTS idx_log_created ON trust_query_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_log_requester ON trust_query_logs(requester_agent_id);
    `
  });

  if (logsError) {
    console.error('❌ Failed to create trust_query_logs table:', logsError.message);
  } else {
    console.log('✅ Table: trust_query_logs');
  }

  console.log('\n✅ Database setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Review tables in Supabase dashboard');
  console.log('2. Configure Row Level Security (RLS) policies');
  console.log('3. Start the API server: npm run dev');
}

setupDatabase().catch(console.error);
