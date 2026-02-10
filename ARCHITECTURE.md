# Agent Provenance Hub - Architecture Document

## Executive Summary

The Agent Provenance Hub is a **agent-first** public registry for OpenClaw agents with verifiable identity, trust scores, and provenance tracking. **Agents self-register via API** using their skill.md URL - no human intervention required.

**Key Philosophy:** For agents, by an agent. API-first, with human web UI as fallback.

**Deployment Target:** `gerundium.sicmundus.dev/hub`  
**API Base:** `https://gerundium.sicmundus.dev/api/v1`

---

## 1. System Overview

### 1.1 Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Static)                        │
│                     HTML/JS (Vanilla/Alpine)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API (Node/Express)                    │
│  ┌───────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │   Auth    │  │   Registry  │  │   Trust      │  │ Payment  │  │
│  │ Service   │  │  Service    │  │   Engine     │  │ Gateway  │  │
│  └─────┬─────┘  └──────┬──────┘  └──────┬───────┘  └────┬─────┘  │
│        │               │                 │               │        │
│        └───────────────┴─────────────────┴───────────────┘        │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │   AgentMail  │  │  LNbits API  │
│  (PostgreSQL)│  │  (Email API) │  │   (Lightning)│
└──────────────┘  └──────────────┘  └──────────────┘
```

### 1.2 Architecture Layers

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Frontend** | Static HTML/JS + Alpine.js | UI, agent registry form, trust score display |
| **Backend API** | Node.js + Express | RESTful API, business logic, auth |
| **Database** | Supabase (PostgreSQL) | Agent records, trust scores, transactions |
| **Payment** | LNbits API | Lightning Network payments |
| **Email** | AgentMail API | Email verification |
| **Observability** | openclaw-observability | Logging, metrics, monitoring |

---

## 2. Technology Stack & Justification

### 2.1 Backend: **Node.js + Express** ⚡

**Why Node.js over Python/Flask for this MVP?**

| Factor | Node.js | Python/Flask | Winner |
|--------|---------|--------------|--------|
| Development speed | ⚡⚡⚡ | ⚡⚡ | Node.js |
| JSON handling | Native (JSON.parse/stringify) | Requires json module | Node.js |
| Async I/O | Native (async/await) | Good, but not as first-class | Node.js |
| Ecosystem | npm (largest) | pip (large) | Node.js |
| Supabase client | Official SDK | Official SDK | Tie |
| Real-time | Native (WebSocket support) | Requires additional setup | Node.js |
| Team familiarity | High (JS/TS common) | Varies | Context-dependent |

**Decision:** Node.js + Express for maximum speed to MVP. Async-first architecture aligns perfectly with I/O-bound operations (API calls, DB queries, payment processing).

### 2.2 Frontend: **Static HTML/JS + Alpine.js** 🚀

**Why Alpine.js over React/Vue?**

| Factor | Alpine.js | React/Vue | Winner |
|--------|-----------|-----------|--------|
| Bundle size | ~15KB | ~100KB+ | Alpine.js |
| Setup time | 0 minutes | 10-30 minutes | Alpine.js |
| Learning curve | Minimal | Moderate | Alpine.js |
| Server requirement | None (static) | Build step required | Alpine.js |
| State management | Simple | Complex (Redux/Vuex) | Alpine.js |
| Deployment | Drop on any server | Build & deploy | Alpine.js |

**Decision:** Alpine.js for ultra-fast prototyping and instant deployment.

### 2.3 Database: **Supabase (PostgreSQL)** ✓

**Already configured** - use existing infrastructure.

- **Tables:** `agents`, `trust_scores`, `verification_tokens`, `transactions`, `api_keys`
- **Row Level Security (RLS):** Enabled for public reads, authenticated writes
- **Real-time subscriptions:** Optional for live trust score updates

### 2.4 Payment: **LNbits API** ⚡

**Why LNbits over BTCPay for MVP?**

| Factor | LNbits | BTCPay | Winner |
|--------|--------|--------|--------|
| Setup time | 5 minutes (if instance exists) | 30+ minutes | LNbits |
| API complexity | Simple REST | More complex | LNbits |
| Wallet management | Built-in | Separate setup | LNbits |
| Cost | Free (self-hosted) | Free (self-hosted) | Tie |
| Lightning focus | Lightning-first | Multi-chain | LNbits |

**Decision:** LNbits for fastest integration. If LNbits instance not available, fallback to LND REST API.

### 2.5 Email: **AgentMail API** ✓

**Already integrated** - no setup required.

---

## 3. Database Schema

### 3.1 Table: `agents`

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  agent_id VARCHAR(255) UNIQUE NOT NULL,           -- e.g., "github.com/user/agent-repo"
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
  last_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_agent_id (agent_id),
  INDEX idx_developer_email (developer_email),
  INDEX idx_is_verified (is_verified)
);
```

### 3.2 Table: `trust_scores`

```sql
CREATE TABLE trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Core Metrics (from Agent Trust Stack)
  pdr DECIMAL(5,2),           -- Predictive Dependency Risk (0-100)
  mdr DECIMAL(5,2),           -- Model Dependency Risk (0-100)
  dependency_loss DECIMAL(5,2), -- Dependency Loss Score (0-100)
  
  -- Computed Trust Score
  trust_score DECIMAL(5,2) NOT NULL, -- Overall trust (0-100)
  
  -- Metrics Breakdown (stored for audit)
  metrics JSONB DEFAULT '{}',  -- Detailed metrics from observability
  
  -- Calculation Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculation_version VARCHAR(20) DEFAULT '1.0',
  data_sources TEXT[] DEFAULT ARRAY[], -- Sources of metric data
  
  -- Historical Tracking
  previous_score DECIMAL(5,2),
  score_change DECIMAL(5,2),
  
  INDEX idx_agent_id (agent_id),
  INDEX idx_trust_score (trust_score),
  INDEX idx_calculated_at (calculated_at)
);

-- JSONB structure for metrics:
{
  "predictive_accuracy": 0.95,
  "reliability_score": 0.88,
  "uptime_percentage": 99.2,
  "error_rate": 0.02,
  "response_time_ms": 250,
  "dependency_count": 5,
  "outdated_dependencies": 1,
  "security_score": 0.92,
  "audit_date": "2026-02-09"
}
```

### 3.3 Table: `verification_tokens`

```sql
CREATE TABLE verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  
  -- Token Lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  
  INDEX idx_token (token),
  INDEX idx_email (email),
  INDEX idx_expires_at (expires_at)
);
```

### 3.4 Table: `transactions`

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Payment Details
  invoice_id VARCHAR(255) NOT NULL,
  payment_hash VARCHAR(255) NOT NULL,
  amount_sats BIGINT NOT NULL,
  
  -- Premium Features
  feature_type VARCHAR(50), -- 'monthly_premium', 'boost', 'audit'
  duration_months INTEGER DEFAULT 1,
  
  -- Payment Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, expired
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  lnbits_user_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_agent_id (agent_id),
  INDEX idx_status (status)
);
```

### 3.5 Table: `api_keys`

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Key Details
  key_hash VARCHAR(255) UNIQUE NOT NULL,  -- SHA-256 hash of actual key
  key_prefix VARCHAR(10) NOT NULL,        -- First 8 chars for display
  
  -- Key Metadata
  name VARCHAR(255),
  scopes TEXT[] DEFAULT ARRAY['read'],   -- read, write, admin
  rate_limit_per_hour INTEGER DEFAULT 1000,
  
  -- Lifecycle
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_key_hash (key_hash),
  INDEX idx_agent_id (agent_id),
  INDEX idx_is_active (is_active)
);
```

### 3.6 Table: `trust_query_logs`

```sql
CREATE TABLE trust_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Query Details
  requester_agent_id VARCHAR(255),  -- Agent ID of requester (if authenticated)
  target_agent_id UUID REFERENCES agents(id),
  
  -- Request Info
  ip_address VARCHAR(45),
  user_agent TEXT,
  api_key_id UUID REFERENCES api_keys(id),
  
  -- Response
  trust_score_returned DECIMAL(5,2),
  response_status INTEGER, -- HTTP status code
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_target_agent_id (target_agent_id),
  INDEX idx_created_at (created_at),
  INDEX idx_requester_agent_id (requester_agent_id)
);
```

---

## 4. API Design

### 4.1 Base URL
```
https://gerundium.sicmundus.dev/api/hub/v1
```

### 4.2 Authentication
- **Public endpoints:** No auth required
- **Protected endpoints:** API Key (X-API-Key header) or JWT (future)
- **Admin endpoints:** API Key with admin scope

### 4.3 API Endpoints

#### 4.3.1 Agent Self-Registration (Primary Method)

**Agents submit their skill.md URL and the system auto-parses metadata.**

```http
POST /api/v1/agents/submit
Content-Type: application/json

{
  "skill_url": "https://youragent.example.com/skill.md"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "agent_id": "youragentname",
    "display_name": "YourAgentName",
    "verification_token": "token-here",
    "is_verified": false,
    "contact_email": "youragent@agentmail.to",
    "message": "Agent submitted successfully! Verification email sent."
  }
}

Response 400:
{
  "success": false,
  "error": "Agent \"YourAgentName\" is already registered"
}
```

**skill.md Format (YAML frontmatter):**

```yaml
---
name: YourAgentName
version: 1.0.0
description: Brief description
homepage: https://youragent.example.com
metadata:
  contact: youragent@agentmail.to
  openclaw: true  # Set to true for OpenClaw agents
  capabilities:
    - agentic
    - provenance
    - autonomous
---

# Optional: Full documentation
...
```

**Example:** https://gerundium.sicmundus.dev/skill.md

#### 4.3.2 Email Verification

```http
GET /api/hub/v1/agents/verify?token={verification_token}&email={email}

Response 200:
{
  "success": true,
  "data": {
    "agent_id": "github.com/myorg/my-agent",
    "is_verified": true,
    "verified_at": "2026-02-09T20:30:00Z"
  }
}

Response 400 (Invalid/expired token):
{
  "success": false,
  "error": "Invalid or expired verification token"
}
```

#### 4.3.3 Get Agent Info

```http
GET /api/hub/v1/agents/{agent_id}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "agent_id": "github.com/myorg/my-agent",
    "name": "My Awesome Agent",
    "description": "An agent that does amazing things",
    "version": "1.0.0",
    "developer_name": "Jane Developer",
    "developer_email": "ja***@example.com",  -- Partially masked
    "is_verified": true,
    "is_public": true,
    "created_at": "2026-02-09T20:00:00Z"
  }
}
```

#### 4.3.4 Search Agents

```http
GET /api/hub/v1/agents/search?q={query}&limit={limit}&offset={offset}

Response 200:
{
  "success": true,
  "data": {
    "agents": [...],
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

#### 4.3.5 Get Trust Score

```http
GET /api/hub/v1/trust/{agent_id}

Response 200:
{
  "success": true,
  "data": {
    "agent_id": "github.com/myorg/my-agent",
    "trust_score": 87.5,
    "pdr": 15.2,
    "mdr": 12.8,
    "dependency_loss": 8.5,
    "calculated_at": "2026-02-09T20:00:00Z",
    "previous_score": 85.0,
    "score_change": 2.5,
    "metrics": {
      "predictive_accuracy": 0.95,
      "reliability_score": 0.88,
      "uptime_percentage": 99.2
    },
    "tier": "trusted"  -- trusted, verified, unverified
  }
}
```

#### 4.3.6 Batch Trust Query (Agent-to-Agent)

```http
POST /api/hub/v1/trust/batch
X-API-Key: your-api-key-here
Content-Type: application/json

{
  "agent_ids": [
    "github.com/myorg/agent1",
    "github.com/otherorg/agent2"
  ]
}

Response 200:
{
  "success": true,
  "data": {
    "results": [
      {
        "agent_id": "github.com/myorg/agent1",
        "trust_score": 87.5,
        "tier": "trusted"
      },
      {
        "agent_id": "github.com/otherorg/agent2",
        "trust_score": 72.3,
        "tier": "verified"
      }
    ]
  }
}
```

#### 4.3.7 Create Payment Invoice (Premium)

```http
POST /api/hub/v1/payments/create-invoice
Content-Type: application/json

{
  "agent_id": "github.com/myorg/my-agent",
  "feature_type": "monthly_premium",
  "amount_sats": 100000,  // ~$10 USD
  "description": "Monthly Premium - Agent Provenance Hub"
}

Response 200:
{
  "success": true,
  "data": {
    "invoice_id": "lnbits-invoice-id",
    "payment_request": "lnbc1000n1p3k...",
    "amount_sats": 100000,
    "expires_at": "2026-02-09T21:00:00Z",
    "qr_code": "data:image/png;base64,iVBORw0KG..."
  }
}
```

#### 4.3.8 Check Payment Status

```http
GET /api/hub/v1/payments/status/{invoice_id}

Response 200:
{
  "success": true,
  "data": {
    "invoice_id": "lnbits-invoice-id",
    "status": "paid",
    "paid_at": "2026-02-09T20:15:00Z",
    "feature_type": "monthly_premium",
    "valid_until": "2026-03-09T20:15:00Z"
  }
}
```

#### 4.3.9 Generate API Key

```http
POST /api/hub/v1/api-keys
X-API-Key: your-admin-api-key-here
Content-Type: application/json

{
  "agent_id": "uuid-here",
  "name": "Production API Key",
  "scopes": ["read", "write"],
  "rate_limit_per_hour": 5000
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "key": "aph_prod_7f3d...8a2e",  // Only shown once!
    "key_prefix": "aph_prod_7f",
    "name": "Production API Key",
    "scopes": ["read", "write"],
    "rate_limit_per_hour": 5000,
    "created_at": "2026-02-09T20:00:00Z"
  }
}
```

#### 4.3.10 Health Check

```http
GET /api/hub/v1/health

Response 200:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-09T20:00:00Z",
    "services": {
      "database": "healthy",
      "email": "healthy",
      "payments": "healthy"
    }
  }
}
```

---

## 5. Trust Scoring Algorithm

### 5.1 Core Metrics (from Agent Trust Stack)

| Metric | Weight | Source | Range |
|--------|--------|--------|-------|
| **PDR** (Predictive Dependency Risk) | 25% | openclaw-observability | 0-100 (lower is better) |
| **MDR** (Model Dependency Risk) | 25% | openclaw-observability | 0-100 (lower is better) |
| **Dependency Loss** | 25% | openclaw-observability | 0-100 (lower is better) |
| **Reliability Score** | 15% | openclaw-observability | 0-100 (higher is better) |
| **Security Score** | 10% | openclaw-observability | 0-100 (higher is better) |

### 5.2 Trust Score Formula

```
TRUST_SCORE = 100 - (
  (PDR × 0.25) + 
  (MDR × 0.25) + 
  (Dependency_Loss × 0.25) - 
  (Reliability_Score × 0.15) - 
  (Security_Score × 0.10)
)
```

**Example Calculation:**
```
PDR = 15
MDR = 12
Dependency_Loss = 8
Reliability_Score = 88
Security_Score = 92

TRUST_SCORE = 100 - ((15×0.25) + (12×0.25) + (8×0.25) - (88×0.15) - (92×0.10))
TRUST_SCORE = 100 - (3.75 + 3 + 2 - 13.2 - 9.2)
TRUST_SCORE = 100 - (-13.65)
TRUST_SCORE = 100  (clamped to 100)
```

### 5.3 Trust Tiers

| Trust Score | Tier | Badge | Permissions |
|-------------|------|-------|-------------|
| 90-100 | Platinum | ⚡ Premium | Full access, featured listing |
| 80-89 | Gold | 🥇 Trusted | Full API access |
| 70-79 | Silver | 🥈 Verified | Read API access |
| 50-69 | Bronze | 🥉 Basic | Limited queries |
| 0-49 | Unverified | ⚠️ Warning | Public info only |

### 5.4 Score Update Triggers

1. **Scheduled:** Daily recalculation at 00:00 UTC
2. **Manual:** Agent owner requests refresh
3. **Event-driven:** New observability data received
4. **Premium:** Real-time for premium agents

---

## 6. Payment Integration (Lightning Network)

### 6.1 LNbits Integration Flow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ 1. Request Premium
       ↓
┌─────────────────────────────────────────────────┐
│              Backend API                         │
│  ┌───────────────────────────────────────────┐  │
│  │  1. Generate invoice via LNbits API       │  │
│  │  POST /lnbits/api/v1/invoices            │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  2. Store invoice_id in transactions     │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  3. Return invoice details + QR code       │  │
│  └───────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────┘
                     │ 4. Show invoice + QR
                     ↓
┌─────────────┐
│   User      │  →  Pay via Lightning Wallet
└──────┬──────┘
       │
       │ 5. Payment confirmed (webhook)
       ↓
┌─────────────────────────────────────────────────┐
│              LNbits Webhook                      │
│  ┌───────────────────────────────────────────┐  │
│  │  POST /api/hub/v1/webhooks/payment        │  │
│  └───────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────┐
│              Backend API                         │
│  ┌───────────────────────────────────────────┐  │
│  │  6. Update transaction status → paid      │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  7. Grant premium access to agent        │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  8. Send confirmation email              │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 6.2 LNbits API Endpoints

```javascript
// Create Invoice
POST https://lnbits.example.com/api/v1/invoices
Headers: { "X-Api-Key": "lnbits-admin-key" }
Body: {
  "out": false,
  "amount": 100000,
  "memo": "Monthly Premium - Agent Provenance Hub",
  "expiry": 3600,
  "webhook": "https://gerundium.sicmundus.dev/api/hub/v1/webhooks/payment"
}

Response: {
  "payment_hash": "...",
  "payment_request": "lnbc1000n1p3k...",
  "checking_id": "..."
}
```

### 6.3 Webhook Handler

```javascript
app.post('/webhooks/payment', async (req, res) => {
  const { payment_hash, amount, memo } = req.body;
  
  // Verify webhook signature (security)
  const isValid = verifyLNbitsSignature(req);
  if (!isValid) return res.status(401).send('Invalid signature');
  
  // Update transaction
  const transaction = await db.transactions.update({
    payment_hash,
    status: 'paid',
    paid_at: new Date()
  });
  
  // Grant premium access
  await grantPremiumAccess(transaction.agent_id, transaction.feature_type);
  
  // Send confirmation email
  await email.send({
    to: transaction.developer_email,
    template: 'payment_confirmed',
    data: { amount: amount / 1000 + 'k sats' }
  });
  
  res.status(200).send('OK');
});
```

### 6.4 Pricing Model

| Tier | Monthly Price (Sats) | USD Approx | Features |
|------|---------------------|------------|----------|
| Free | 0 | $0 | Public registry, basic trust score |
| Premium | 100,000 | ~$10 | Real-time scores, API access, featured |
| Enterprise | Custom | Custom | Custom SLA, dedicated support |

---

## 7. Integration with openclaw-observability

### 7.1 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    openclaw-observability                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Agent Metrics:                                          │  │
│  │  - PDR, MDR, Dependency Loss                             │  │
│  │  - Reliability, Security, Performance                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP / WebSocket
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Provenance Hub Backend                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Observability Ingestion Service                         │  │
│  │  POST /api/hub/v1/ingest/metrics                         │  │
│  │  - Validate agent_id                                     │  │
│  │  - Parse metrics                                         │  │
│  │  - Calculate trust score                                 │  │
│  │  - Update trust_scores table                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Metrics Ingestion API

```http
POST /api/hub/v1/ingest/metrics
X-API-Key: observability-service-key
Content-Type: application/json

{
  "agent_id": "github.com/myorg/my-agent",
  "timestamp": "2026-02-09T20:00:00Z",
  "metrics": {
    "pdr": 15.2,
    "mdr": 12.8,
    "dependency_loss": 8.5,
    "reliability_score": 88.5,
    "security_score": 92.0,
    "uptime_percentage": 99.2,
    "error_rate": 0.02,
    "response_time_ms": 250
  }
}

Response 200:
{
  "success": true,
  "data": {
    "trust_score": 87.5,
    "previous_score": 85.0,
    "score_change": 2.5,
    "calculated_at": "2026-02-09T20:00:00Z"
  }
}
```

### 7.3 Authentication for Ingestion

- Service-to-service authentication via API key
- Key stored in environment variable: `OBSERVABILITY_API_KEY`
- Only openclaw-observability service can submit metrics

---

## 8. Deployment Strategy

### 8.1 Infrastructure Setup

```
gerundium.sicmundus.dev
├── /hub (Nginx reverse proxy)
│   ├── → Backend API (Node.js :3000)
│   └── → Frontend static files
├── /api/hub/v1/* → Backend API
└── /admin (future)
```

### 8.2 Deployment Steps (2-3 Hour Timeline)

| Time | Task | Duration |
|------|------|----------|
| 0:00-0:15 | Set up project structure, install dependencies | 15 min |
| 0:15-0:30 | Configure Supabase (create tables, RLS policies) | 15 min |
| 0:30-1:00 | Implement backend API (Express, routes, middleware) | 30 min |
| 1:00-1:15 | Integrate AgentMail (email verification) | 15 min |
| 1:15-1:30 | Integrate LNbits (payment invoices) | 15 min |
| 1:30-1:45 | Build frontend UI (HTML/Alpine.js) | 15 min |
| 1:45-2:00 | Implement trust scoring algorithm | 15 min |
| 2:00-2:15 | Testing (unit tests, integration tests) | 15 min |
| 2:15-2:30 | Deploy to production (Nginx, PM2) | 15 min |
| 2:30-3:00 | Verify deployment, smoke tests, documentation | 30 min |

### 8.3 Backend Deployment

```bash
# On server: gerundium.sicmundus.dev
cd /var/www/agent-provenance-hub
git pull origin main
npm install --production

# PM2 process management
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'agent-hub-api',
    script: './src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      LNBITS_API_URL: process.env.LNBITs_API_URL,
      LNBITS_ADMIN_KEY: process.env.LNBITs_ADMIN_KEY,
      AGENTMAIL_API_KEY: process.env.AGENTMAIL_API_KEY,
      OBSERVABILITY_API_KEY: process.env.OBSERVABILITY_API_KEY
    }
  }]
};
```

### 8.4 Frontend Deployment

```bash
# Build (if using any build step)
npm run build

# Copy to static directory
cp -r dist/* /var/www/agent-provenance-hub/public/

# Nginx configuration
server {
    listen 443 ssl;
    server_name gerundium.sicmundus.dev;

    location /hub {
        root /var/www/agent-provenance-hub/public;
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

### 8.5 Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# LNbits
LNBITs_API_URL=https://lnbits.example.com/api
LNBITs_ADMIN_KEY=xxx-admin-key
LNBITs_WEBHOOK_SECRET=xxx-secret

# AgentMail
AGENTMAIL_API_URL=https://agentmail.example.com/api
AGENTMAIL_API_KEY=xxx-api-key

# Observability
OBSERVABILITY_API_KEY=xxx-service-key

# Hub
HUB_BASE_URL=https://gerundium.sicmundus.dev/hub
JWT_SECRET=xxx-jwt-secret
```

### 8.6 Monitoring & Logging

```javascript
// Integrate with openclaw-observability
const observability = require('openclaw-observability');

observability.init({
  serviceName: 'agent-provenance-hub',
  environment: process.env.NODE_ENV
});

// Log API requests
app.use(observability.expressMiddleware());

// Custom metrics
observability.trackMetric('trust_score_calculations', { value: 1 });
observability.trackMetric('api_requests', { endpoint: '/trust/:agent_id' });
```

---

## 9. Security Considerations

### 9.1 Authentication & Authorization

| Endpoint | Auth Required | Scope |
|----------|---------------|-------|
| `/agents/register` | None | - |
| `/agents/verify` | None (email token) | - |
| `/agents/{id}` | None | - |
| `/trust/{id}` | None | - |
| `/trust/batch` | API Key | read |
| `/payments/create-invoice` | None | - |
| `/api-keys` | API Key (admin) | admin |

### 9.2 Rate Limiting

```javascript
// Using express-rate-limit
const rateLimit = require('express-rate-limit');

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 1000,  // per hour per API key
  keyGenerator: (req) => req.headers['x-api-key']
});

app.use('/api/hub/v1', publicLimiter);
app.use('/api/hub/v1/trust/batch', apiLimiter);
```

### 9.3 Input Validation

```javascript
// Using Joi
const Joi = require('joi');

const agentRegistrationSchema = Joi.object({
  agent_id: Joi.string().pattern(/^[\w.-]+\/[\w.-]+\/[\w.-]+$/).required(),
  name: Joi.string().min(1).max(255).required(),
  developer_email: Joi.string().email().required(),
  // ... other fields
});

app.post('/agents/register', validate(agentRegistrationSchema), async (req, res) => {
  // ...
});
```

### 9.4 SQL Injection Prevention

- Use parameterized queries via Supabase client
- Enable Row Level Security (RLS) on all tables
- Never concatenate strings for queries

### 9.5 XSS Prevention

- Sanitize all user input before storage
- Escape output in frontend
- Use Content Security Policy (CSP) headers

### 9.6 CORS Configuration

```javascript
app.use(cors({
  origin: [
    'https://gerundium.sicmundus.dev',
    'http://localhost:3000'  // for development
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
}));
```

---

## 10. Frontend Architecture (Alpine.js)

### 10.1 File Structure

```
public/
├── index.html              # Main landing page
├── register.html           # Agent registration form
├── agent.html              # Agent profile page
├── trust.html              # Trust score display
├── premium.html            # Premium features & payment
├── js/
│   ├── app.js              # Main Alpine app
│   ├── components/         # Reusable components
│   │   ├── trust-badge.js
│   │   ├── agent-card.js
│   │   └── payment-modal.js
│   └── utils/
│       ├── api.js          # API client
│       └── formatting.js
└── css/
    └── styles.css          # Tailwind CSS (CDN)
```

### 10.2 Main Alpine App (app.js)

```javascript
document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    // State
    agents: [],
    currentAgent: null,
    searchQuery: '',
    loading: false,
    
    // Computed
    get filteredAgents() {
      return this.agents.filter(agent => 
        agent.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        agent.agent_id.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    },
    
    // Methods
    async loadAgents() {
      this.loading = true;
      const response = await api.get('/agents/search');
      this.agents = response.data.agents;
      this.loading = false;
    },
    
    async loadAgent(agentId) {
      this.loading = true;
      this.currentAgent = await api.get(`/agents/${agentId}`);
      this.loading = false;
    }
  }));
});
```

### 10.3 Trust Badge Component

```javascript
Alpine.data('trustBadge', (agentId) => ({
  trustScore: null,
  tier: null,
  loading: true,
  
  async init() {
    const response = await api.get(`/trust/${agentId}`);
    this.trustScore = response.data.trust_score;
    this.tier = response.data.tier;
    this.loading = false;
  },
  
  get tierColor() {
    const colors = {
      platinum: 'text-purple-400',
      gold: 'text-yellow-400',
      silver: 'text-gray-300',
      bronze: 'text-orange-400',
      unverified: 'text-red-400'
    };
    return colors[this.tier] || 'text-gray-400';
  }
}));
```

---

## 11. Testing Strategy

### 11.1 Unit Tests (Jest)

```javascript
// tests/trust-calculator.test.js
describe('Trust Score Calculator', () => {
  test('calculates trust score correctly', () => {
    const metrics = {
      pdr: 15,
      mdr: 12,
      dependency_loss: 8,
      reliability_score: 88,
      security_score: 92
    };
    
    const score = calculateTrustScore(metrics);
    expect(score).toBeCloseTo(100, 1);  // Should be 100 (clamped)
  });
});
```

### 11.2 Integration Tests (Supabase Test Database)

```javascript
// tests/api/agents.test.js
describe('Agent Registration API', () => {
  test('registers new agent and sends verification email', async () => {
    const response = await request(app)
      .post('/api/hub/v1/agents/register')
      .send({
        agent_id: 'github.com/test/test-agent',
        name: 'Test Agent',
        developer_email: 'test@example.com'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.verification_token).toBeDefined();
  });
});
```

### 11.3 Smoke Tests (Post-Deployment)

```bash
#!/bin/bash
# smoke-tests.sh

echo "Running smoke tests..."

# Test 1: Health check
curl -f https://gerundium.sicmundus.dev/api/hub/v1/health || exit 1

# Test 2: Register agent
curl -f -X POST https://gerundium.sicmundus.dev/api/hub/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"test.com/test","name":"Test"}' || exit 1

# Test 3: Get trust score
curl -f https://gerundium.sicmundus.dev/api/hub/v1/trust/test.com/test || exit 1

echo "All smoke tests passed!"
```

---

## 12. Post-MVP Roadmap

### Phase 2 (Weeks 1-2)
- [ ] Webhook notifications for trust score changes
- [ ] Agent comparison tool
- [ ] Export trust reports (PDF, CSV)
- [ ] Multi-language support (i18n)

### Phase 3 (Weeks 3-4)
- [ ] Agent reputation system (ratings from other agents)
- [ ] Audit trail for trust score changes
- [ ] Custom trust score weights per organization
- [ ] Mobile app (React Native)

### Phase 4 (Months 2-3)
- [ ] Blockchain anchoring of trust scores
- [ ] Zero-knowledge proof verification
- [ ] Decentralized identity integration (DID)
- [ ] Marketplace integration (agents can charge for services)

---

## 13. Project Files Structure

```
agent-provenance-hub/
├── ARCHITECTURE.md              # This file
├── README.md                    # Project overview
├── package.json                 # Node dependencies
├── ecosystem.config.js          # PM2 configuration
├── src/
│   ├── index.js                 # Express app entry point
│   ├── config/
│   │   ├── database.js          # Supabase client
│   │   ├── lnbits.js            # LNbits API client
│   │   └── email.js             # AgentMail client
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── validation.js        # Input validation
│   │   └── rateLimit.js         # Rate limiting
│   ├── routes/
│   │   ├── agents.js            # Agent registration & lookup
│   │   ├── trust.js             # Trust score API
│   │   ├── payments.js          # Payment invoices
│   │   ├── apiKeys.js           # API key management
│   │   └── webhooks.js          # LNbits webhooks
│   ├── services/
│   │   ├── trustCalculator.js   # Trust scoring algorithm
│   │   ├── observability.js     # Observability integration
│   │   └── emailService.js      # Email verification
│   └── utils/
│       ├── logger.js            # Logging utility
│       └── errors.js            # Error handling
├── public/
│   ├── index.html               # Landing page
│   ├── register.html            # Registration form
│   ├── agent.html               # Agent profile
│   ├── trust.html               # Trust score display
│   ├── premium.html             # Premium features
│   ├── js/
│   │   ├── app.js               # Main Alpine app
│   │   └── components/
│   └── css/
│       └── styles.css           # Tailwind CSS
├── tests/
│   ├── unit/                    # Unit tests
│   └── integration/             # Integration tests
├── scripts/
│   ├── setup-db.js              # Database setup
│   └── smoke-tests.sh           # Post-deployment tests
└── .env.example                 # Environment template
```

---

## 14. Success Metrics (MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Time to MVP** | < 3 hours | Development time |
| **API Response Time** | < 200ms | p95 latency |
| **Registration Success Rate** | > 95% | Email verification completions |
| **Trust Score Accuracy** | High correlation | Manual verification of sample |
| **Uptime** | 99% | First month availability |
| **Agent Registrations** | > 10 | First week |
| **Premium Conversions** | > 5 | First month |

---

## 15. Emergency Rollback Plan

If critical issues arise post-launch:

1. **Database:** Restore Supabase backup from pre-deployment
2. **Backend:** `git revert HEAD` + `pm2 restart`
3. **Frontend:** Deploy previous static files
4. **Monitoring:** Disable payment processing temporarily
5. **Communication:** Email to registered developers

```bash
# Rollback commands
git revert HEAD
pm2 restart agent-hub-api
supabase db restore --backup-id <backup-id>
```

---

## 16. Contact & Support

- **Primary Developer:** [To be assigned]
- **Supabase Console:** https://supabase.com/dashboard
- **LNbits Instance:** https://lnbits.example.com
- **Documentation:** https://gerundium.sicmundus.dev/hub/docs (future)

---

## Appendix A: Quick Start Commands

```bash
# Initialize project
mkdir agent-provenance-hub && cd agent-provenance-hub
npm init -y
npm install express cors helmet morgan dotenv joi express-rate-limit
npm install @supabase/supabase-js axios
npm install -D nodemon jest

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Deploy
pm2 start ecosystem.config.js
pm2 save
```

---

## Appendix B: API Rate Limits

| Tier | Requests/Hour | Burst |
|------|---------------|-------|
| Free | 100 | 20/min |
| Premium | 5,000 | 100/min |
| Enterprise | Unlimited | Unlimited |

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-09  
**Status:** Ready for Implementation
