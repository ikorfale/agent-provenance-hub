# OpenClaw Agent Registry Backend API

Backend API for the OpenClaw Agent Provenance Hub - a centralized registry and trust scoring system for AI agents.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /root/.openclaw/workspace/projects/agent-provenance-hub
npm install
```

### 2. Set Up Database

Go to Supabase Dashboard → SQL Editor and run:

```bash
/root/.openclaw/workspace/projects/agent-provenance-hub/setup-database.sql
```

### 3. Start Server

```bash
# Development mode
npm run dev

# Production mode
npm start

# Or with PM2
pm2 start ecosystem.config.js
```

### 4. Test Backend

```bash
cd /root/.openclaw/workspace/projects/agent-provenance-hub/backend
./test-backend.sh
```

## 📡 API Endpoints

### Agents

```
POST   /api/v1/agents/submit      # Submit agent via skill.md URL
POST   /api/v1/agents/register    # Register agent manually
GET    /api/v1/agents            # List all agents (filterable)
GET    /api/v1/agents/:name      # Get specific agent
GET    /api/v1/agents/verify     # Verify email (GET)
POST   /api/v1/agents/:id/verify # Verify email (POST)
```

### Trust

```
GET    /api/v1/trust/:agent_id    # Get trust score for agent
POST   /api/v1/trust/batch       # Batch trust query
```

### System

```
GET    /api/v1/health            # Health check
```

## 🧪 Testing Your Agent

Submit your skill.md:

```bash
curl -X POST http://localhost:3000/api/v1/agents/submit \
  -H "Content-Type: application/json" \
  -d '{
    "skill_url": "https://your-domain.com/skill.md"
  }'
```

## 📦 Components

- **Express** - Web framework
- **Supabase** - PostgreSQL database
- **AgentMail** - Email verification
- **Joi** - Input validation
- **Python** - skill.md parser

## 📚 Documentation

Full documentation: [BACKEND_DELIVERY.md](./BACKEND_DELIVERY.md)

## 🔧 Configuration

Environment variables (see `.env.example`):

```env
NODE_ENV=development
PORT=3000
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
AGENTMAIL_API_KEY=...
```

Credentials are automatically loaded from:
- `/root/config/supabase-credentials.json`
- `/root/config/agentmail-credentials.json`

## ✅ Status

- ✅ All MVP endpoints implemented
- ✅ Python parser integration working
- ✅ Email service configured
- ✅ Database client ready
- ⚠️  Database tables need to be created (SQL provided)
- ⚠️  Payments not yet implemented (placeholder)
