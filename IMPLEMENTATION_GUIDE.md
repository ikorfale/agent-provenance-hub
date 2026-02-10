# Implementation Guide - Agent Provenance Hub

## 🚀 Quick Start (2-3 Hour MVP)

This guide will help you implement the MVP in 2-3 hours by following the pre-configured architecture.

---

## Phase 1: Setup (15 minutes)

### 1.1 Install Dependencies
```bash
cd /root/.openclaw/workspace/projects/agent-provenance-hub
npm install
```

### 1.2 Configure Environment
```bash
cp .env.example .env
# Edit .env with your actual credentials
nano .env
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `LNBITs_API_URL` - Your LNbits instance URL
- `LNBITs_ADMIN_KEY` - LNbits admin key
- `AGENTMAIL_API_KEY` - AgentMail API key

### 1.3 Set Up Database
```bash
npm run setup-db
```

This will create all necessary tables in Supabase.

---

## Phase 2: Backend API (45 minutes)

### 2.1 Create Configuration Files

**`src/config/database.js`**
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabase, supabaseAdmin };
```

**`src/config/lnbits.js`**
```javascript
const axios = require('axios');

const LNBITs_API_URL = process.env.LNBITs_API_URL;
const LNBITs_ADMIN_KEY = process.env.LNBITs_ADMIN_KEY;

const lnbitsClient = axios.create({
  baseURL: LNBITs_API_URL,
  headers: {
    'X-Api-Key': LNBITs_ADMIN_KEY
  }
});

module.exports = { lnbitsClient };
```

**`src/config/email.js`**
```javascript
const axios = require('axios');

const AGENTMAIL_API_URL = process.env.AGENTMAIL_API_URL;
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;

async function sendEmail(to, subject, html) {
  await axios.post(`${AGENTMAIL_API_URL}/send`, {
    to,
    subject,
    html,
    apiKey: AGENTMAIL_API_KEY
  });
}

module.exports = { sendEmail };
```

### 2.2 Create Utility Files

**`src/utils/tokens.js`**
```javascript
const crypto = require('crypto');

function generateVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return { token, expiresAt };
}

function generateApiKey() {
  const prefix = 'aph_' + crypto.randomBytes(4).toString('hex');
  const key = prefix + crypto.randomBytes(20).toString('hex');
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  
  return { key, keyHash, prefix: key.substring(0, 10) };
}

module.exports = { generateVerificationToken, generateApiKey };
```

### 2.3 Create Services

**`src/services/emailService.js`**
```javascript
const { sendEmail } = require('../config/email');
const HUB_BASE_URL = process.env.HUB_BASE_URL;

async function sendVerificationEmail(email, token, agentId) {
  const verificationUrl = `${HUB_BASE_URL}/api/hub/v1/agents/verify?token=${token}&email=${encodeURIComponent(email)}`;
  
  const html = `
    <h2>Verify Your Agent Registration</h2>
    <p>You registered the agent <strong>${agentId}</strong>.</p>
    <p>Click the link below to verify your email:</p>
    <p><a href="${verificationUrl}">Verify Email</a></p>
    <p>This link expires in 24 hours.</p>
  `;
  
  await sendEmail(email, 'Verify Your Agent - Agent Provenance Hub', html);
}

module.exports = { sendVerificationEmail };
```

### 2.4 Create Middleware

**`src/middleware/validation.js`**
```javascript
const Joi = require('joi');

const agentRegistrationSchema = Joi.object({
  agent_id: Joi.string().pattern(/^[\w.-]+\/[\w.-]+\/[\w.-]+$/).required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(5000),
  version: Joi.string().max(50),
  developer_name: Joi.string().max(255),
  developer_email: Joi.string().email().required(),
  homepage_url: Joi.string().uri().max(500),
  repo_url: Joi.string().uri().max(500),
  documentation_url: Joi.string().uri().max(500)
});

function validateAgentRegistration(req, res, next) {
  const { error } = agentRegistrationSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  
  next();
}

module.exports = { validateAgentRegistration };
```

### 2.5 Create Remaining Routes

**`src/routes/trust.js`** (create this file)
```javascript
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/errors');
const { supabase } = require('../config/database');
const { calculateTrustScore, getTrustTier, getTierBadge } = require('../services/trustCalculator');

/**
 * GET /api/hub/v1/trust/:agent_id
 */
router.get('/:agent_id', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  
  // Get agent by agent_id
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id')
    .eq('agent_id', agent_id)
    .single();
  
  if (agentError || !agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  // Get latest trust score
  const { data: trustScore, error: trustError } = await supabase
    .from('trust_scores')
    .select('*')
    .eq('agent_id', agent.id)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (trustError || !trustScore) {
    return res.json({
      success: true,
      data: {
        agent_id,
        trust_score: 50, // Default score
        tier: 'unverified',
        message: 'Trust score not yet calculated'
      }
    });
  }
  
  const tier = getTrustTier(trustScore.trust_score);
  
  res.json({
    success: true,
    data: {
      agent_id,
      trust_score: trustScore.trust_score,
      pdr: trustScore.pdr,
      mdr: trustScore.mdr,
      dependency_loss: trustScore.dependency_loss,
      calculated_at: trustScore.calculated_at,
      previous_score: trustScore.previous_score,
      score_change: trustScore.score_change,
      metrics: trustScore.metrics,
      tier,
      badge: getTierBadge(tier)
    }
  });
}));

/**
 * POST /api/hub/v1/trust/batch
 */
router.post('/batch', asyncHandler(async (req, res) => {
  const { agent_ids } = req.body;
  
  if (!Array.isArray(agent_ids)) {
    return res.status(400).json({
      success: false,
      error: 'agent_ids must be an array'
    });
  }
  
  // Get agents
  const { data: agents } = await supabase
    .from('agents')
    .select('id, agent_id')
    .in('agent_id', agent_ids);
  
  // Get trust scores for all agents
  const agentIds = agents.map(a => a.id);
  const { data: trustScores } = await supabase
    .from('trust_scores')
    .select('*')
    .in('agent_id', agentIds)
    .order('calculated_at', { ascending: false });
  
  // Group scores by agent_id (get latest for each)
  const latestScores = {};
  for (const score of trustScores || []) {
    if (!latestScores[score.agent_id] || 
        new Date(score.calculated_at) > new Date(latestScores[score.agent_id].calculated_at)) {
      latestScores[score.agent_id] = score;
    }
  }
  
  // Build results
  const results = agents.map(agent => {
    const score = latestScores[agent.id];
    const tier = score ? getTrustTier(score.trust_score) : 'unverified';
    
    return {
      agent_id: agent.agent_id,
      trust_score: score ? score.trust_score : 50,
      tier
    };
  });
  
  res.json({
    success: true,
    data: { results }
  });
}));

module.exports = router;
```

**`src/routes/payments.js`** (create this file)
```javascript
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/errors');
const { lnbitsClient } = require('../config/lnbits');
const { supabase, supabaseAdmin } = require('../config/database');

/**
 * POST /api/hub/v1/payments/create-invoice
 */
router.post('/create-invoice', asyncHandler(async (req, res) => {
  const { agent_id, feature_type = 'monthly_premium', amount_sats = 100000 } = req.body;
  
  // Get agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id, developer_email, developer_name')
    .eq('agent_id', agent_id)
    .single();
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  // Create LNbits invoice
  const memo = `${feature_type} - ${agent_id}`;
  const webhook = `${process.env.HUB_API_URL}/webhooks/payment`;
  
  const { data: invoice } = await lnbitsClient.post('/invoices', {
    out: false,
    amount: amount_sats,
    memo,
    expiry: 3600,
    webhook
  });
  
  // Store transaction record
  await supabaseAdmin.from('transactions').insert({
    agent_id: agent.id,
    invoice_id: invoice.payment_hash,
    payment_hash: invoice.payment_hash,
    amount_sats,
    feature_type,
    status: 'pending'
  });
  
  res.json({
    success: true,
    data: {
      invoice_id: invoice.payment_hash,
      payment_request: invoice.payment_request,
      amount_sats,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invoice.payment_request)}`
    }
  });
}));

/**
 * GET /api/hub/v1/payments/status/:invoice_id
 */
router.get('/status/:invoice_id', asyncHandler(async (req, res) => {
  const { invoice_id } = req.params;
  
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('invoice_id', invoice_id)
    .single();
  
  if (!transaction) {
    return res.status(404).json({
      success: false,
      error: 'Invoice not found'
    });
  }
  
  res.json({
    success: true,
    data: {
      invoice_id: transaction.invoice_id,
      status: transaction.status,
      paid_at: transaction.paid_at,
      feature_type: transaction.feature_type,
      amount_sats: transaction.amount_sats
    }
  });
}));

module.exports = router;
```

**`src/routes/webhooks.js`** (create this file)
```javascript
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/errors');
const { supabaseAdmin } = require('../config/database');
const { sendEmail } = require('../config/email');

/**
 * POST /api/hub/v1/webhooks/payment
 * LNbits payment webhook
 */
router.post('/payment', asyncHandler(async (req, res) => {
  const { payment_hash, amount, memo } = req.body;
  
  console.log('Payment webhook received:', { payment_hash, amount, memo });
  
  // Update transaction status
  const { data: transaction } = await supabaseAdmin
    .from('transactions')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString()
    })
    .eq('invoice_id', payment_hash)
    .select('*')
    .single();
  
  if (!transaction) {
    console.error('Transaction not found for payment hash:', payment_hash);
    return res.status(404).send('Not found');
  }
  
  // Get agent details
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('developer_email, agent_id')
    .eq('id', transaction.agent_id)
    .single();
  
  if (agent) {
    // Send confirmation email
    const html = `
      <h2>Payment Confirmed!</h2>
      <p>Your payment for <strong>${transaction.feature_type}</strong> has been received.</p>
      <p>Amount: ${amount / 1000}k sats</p>
      <p>Thank you for using Agent Provenance Hub!</p>
    `;
    
    await sendEmail(agent.developer_email, 'Payment Confirmed - Agent Provenance Hub', html);
  }
  
  res.status(200).send('OK');
}));

module.exports = router;
```

**`src/routes/apiKeys.js`** (create this file)
```javascript
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/errors');
const { supabaseAdmin } = require('../config/database');
const { generateApiKey } = require('../utils/tokens');

/**
 * POST /api/hub/v1/api-keys
 * Generate a new API key
 */
router.post('/', asyncHandler(async (req, res) => {
  const { agent_id, name = 'API Key', scopes = ['read'], rate_limit_per_hour = 1000 } = req.body;
  
  // Get agent
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, developer_email')
    .eq('id', agent_id)
    .single();
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  // Generate API key
  const { key, keyHash, prefix } = generateApiKey();
  
  // Store in database
  const { data: apiKey, error } = await supabaseAdmin
    .from('api_keys')
    .insert({
      agent_id,
      key_hash: keyHash,
      key_prefix: prefix,
      name,
      scopes,
      rate_limit_per_hour
    })
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to create API key'
    });
  }
  
  res.status(201).json({
    success: true,
    data: {
      id: apiKey.id,
      key, // Only shown once!
      key_prefix: apiKey.key_prefix,
      name: apiKey.name,
      scopes: apiKey.scopes,
      rate_limit_per_hour: apiKey.rate_limit_per_hour,
      created_at: apiKey.created_at
    }
  });
}));

module.exports = router;
```

### 2.6 Start Development Server
```bash
npm run dev
```

Server should start on port 3000.

---

## Phase 3: Frontend (30 minutes)

### 3.1 Create Main HTML Files

**`public/index.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Provenance Hub</title>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <div x-data="app()" x-init="loadAgents()">
    <!-- Header -->
    <header class="bg-gray-800 border-b border-gray-700">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <h1 class="text-3xl font-bold">🤖 Agent Provenance Hub</h1>
        <p class="text-gray-400 mt-2">Trust scores for AI agents</p>
      </div>
    </header>

    <!-- Search -->
    <div class="max-w-7xl mx-auto px-4 py-6">
      <input 
        type="text" 
        x-model="searchQuery"
        placeholder="Search agents..." 
        class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
    </div>

    <!-- Agent List -->
    <div class="max-w-7xl mx-auto px-4 pb-12">
      <template x-if="loading">
        <div class="text-center py-12">Loading...</div>
      </template>

      <template x-for="agent in filteredAgents" :key="agent.id">
        <div class="bg-gray-800 rounded-lg p-6 mb-4 hover:bg-gray-750 transition cursor-pointer">
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-xl font-semibold" x-text="agent.name"></h2>
              <p class="text-gray-400 text-sm" x-text="agent.agent_id"></p>
              <p class="text-gray-300 mt-2" x-text="agent.description"></p>
            </div>
            <div class="text-right">
              <span x-show="agent.is_verified" class="bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                ✓ Verified
              </span>
              <span x-show="!agent.is_verified" class="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm">
                Pending
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <script src="/js/app.js"></script>
</body>
</html>
```

**`public/register.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Register Agent - Agent Provenance Hub</title>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <div x-data="registrationForm()">
    <div class="max-w-2xl mx-auto px-4 py-12">
      <h1 class="text-3xl font-bold mb-8">Register Your Agent</h1>

      <form @submit.prevent="submitRegistration">
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium mb-2">Agent ID*</label>
            <input 
              type="text" 
              x-model="form.agent_id"
              placeholder="github.com/username/agent-name"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
              required
            >
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Name*</label>
            <input 
              type="text" 
              x-model="form.name"
              placeholder="My Awesome Agent"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
              required
            >
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Description</label>
            <textarea 
              x-model="form.description"
              rows="3"
              placeholder="What does your agent do?"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Version</label>
            <input 
              type="text" 
              x-model="form.version"
              placeholder="1.0.0"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
            >
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Your Name</label>
            <input 
              type="text" 
              x-model="form.developer_name"
              placeholder="Jane Developer"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
            >
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Email*</label>
            <input 
              type="email" 
              x-model="form.developer_email"
              placeholder="jane@example.com"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
              required
            >
          </div>

          <button 
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            <span x-show="loading">Registering...</span>
            <span x-show="!loading">Register Agent</span>
          </button>
        </div>
      </form>

      <div x-show="message" 
           x-text="message" 
           :class="error ? 'text-red-400' : 'text-green-400'"
           class="mt-6 text-center">
      </div>
    </div>
  </div>

  <script src="/js/components/registration-form.js"></script>
</body>
</html>
```

**`public/js/app.js`**
```javascript
function app() {
  return {
    agents: [],
    searchQuery: '',
    loading: true,

    async loadAgents() {
      try {
        const response = await fetch('/api/hub/v1/agents/search');
        const result = await response.json();
        if (result.success) {
          this.agents = result.data.agents;
        }
      } catch (error) {
        console.error('Failed to load agents:', error);
      } finally {
        this.loading = false;
      }
    },

    get filteredAgents() {
      if (!this.searchQuery) return this.agents;
      
      const query = this.searchQuery.toLowerCase();
      return this.agents.filter(agent => 
        agent.name.toLowerCase().includes(query) ||
        agent.agent_id.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query)
      );
    }
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('app', app);
});
```

**`public/js/components/registration-form.js`**
```javascript
function registrationForm() {
  return {
    form: {
      agent_id: '',
      name: '',
      description: '',
      version: '',
      developer_name: '',
      developer_email: ''
    },
    loading: false,
    message: '',
    error: false,

    async submitRegistration() {
      this.loading = true;
      this.message = '';
      this.error = false;

      try {
        const response = await fetch('/api/hub/v1/agents/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.form)
        });

        const result = await response.json();

        if (result.success) {
          this.message = 'Registration successful! Check your email to verify.';
          this.form = { agent_id: '', name: '', description: '', version: '', developer_name: '', developer_email: '' };
        } else {
          this.error = true;
          this.message = result.error || 'Registration failed';
        }
      } catch (error) {
        this.error = true;
        this.message = 'Failed to register agent';
      } finally {
        this.loading = false;
      }
    }
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('registrationForm', registrationForm);
});
```

---

## Phase 4: Testing & Deployment (30 minutes)

### 4.1 Run Tests
```bash
npm test
```

### 4.2 Smoke Tests
```bash
bash scripts/smoke-tests.sh
```

### 4.3 Deploy to Production

1. **Copy files to server:**
```bash
scp -r . root@gerundium.sicmundus.dev:/var/www/agent-provenance-hub
```

2. **On server:**
```bash
cd /var/www/agent-provenance-hub
npm install --production
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

3. **Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/agent-hub
```

Add this configuration:
```nginx
server {
    listen 443 ssl;
    server_name gerundium.sicmundus.dev;

    ssl_certificate /etc/ssl/certs/gerundium.sicmundus.dev.crt;
    ssl_certificate_key /etc/ssl/private/gerundium.sicmundus.dev.key;

    location /hub {
        alias /var/www/agent-provenance-hub/public;
        try_files $uri $uri/ /index.html;
    }

    location /api/hub/v1 {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Enable and restart Nginx:**
```bash
sudo ln -s /etc/nginx/sites-available/agent-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **Run smoke tests:**
```bash
bash scripts/smoke-tests.sh
```

---

## 🎉 Congratulations!

Your MVP is now live! Check it out at:
- **Dashboard:** https://gerundium.sicmundus.dev/hub
- **API:** https://gerundium.sicmundus.dev/api/hub/v1

---

## Next Steps

1. **Monitor:** Set up logging and monitoring
2. **Improve:** Add more features based on feedback
3. **Scale:** Consider load balancing for high traffic
4. **Document:** Create API documentation

---

## Troubleshooting

**Database connection failed:**
- Check SUPABASE_URL and SUPABASE_ANON_KEY in .env
- Verify Supabase project is active

**Email verification not working:**
- Check AgentMail API key
- Verify email settings in AgentMail dashboard

**Payments failing:**
- Verify LNbits instance is running
- Check LNbits admin key
- Review webhook configuration

---

**Time Estimate:** 2-3 hours for complete MVP deployment

**Questions?** Check the full ARCHITECTURE.md for detailed documentation.
