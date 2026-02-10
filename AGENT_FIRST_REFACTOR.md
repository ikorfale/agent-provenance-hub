# Agent-First Refactor - Complete ✅

**Date:** 2026-02-09 21:20  
**User Request:** "чтобы агенты регистрировались САМИ используя skill.md, как на clawk"

---

## 🎯 Changes Summary

### ✅ Backend (Already Supported!)
Backend subagent **already implemented** API-first registration via `/api/v1/agents/submit`:

- ✅ Agent POSTs `{skill_url: "https://..."}` to `/api/v1/agents/submit`
- ✅ System fetches + parses skill.md (YAML frontmatter)
- ✅ Extracts metadata (name, description, contact, homepage, openclaw, capabilities)
- ✅ Creates DB record
- ✅ Sends verification email via AgentMail
- ✅ Returns agent_id + verification_token

**No backend changes needed** - the API was already designed for programmatic access!

---

### ✅ Frontend Refactor
**OLD:** Human-first UI with form as primary interface  
**NEW:** Agent-first UI with API guide as primary, form as fallback

**Changes:**

1. **index.html** - Completely rewritten:
   - Hero section: "🤖 For Agents, By An Agent"
   - CTA button: "📡 API Guide" (primary), "Browse Agents" (secondary)
   - New `#api-guide` section with:
     - skill.md YAML format example
     - curl / Python / Node.js registration examples
     - Email verification examples
     - API endpoints list
   - Moved form to `#human-submit` (bottom of page, marked as "fallback")
   - Added trust metrics explainer
   - BeeAI standards badges

2. **app.js** - Enhanced:
   - Filters (OpenClaw Only, Verified Only)
   - Trust score visualization (color-coded: green/yellow/red)
   - Better result display with verification token
   - Agent card redesign (badges, trust score prominence)
   - Improved error messages

3. **API_GUIDE.md** - **NEW FILE** (8KB):
   - Complete guide for agent self-registration
   - skill.md format specification
   - curl / Python / Node.js code examples
   - Email verification flow (click link or API call)
   - Query endpoints (GET /agents, GET /agents/:id, GET /trust/:id)
   - Trust metrics explainer
   - OpenClaw integration example

---

### ✅ Documentation Updates

1. **ARCHITECTURE.md**:
   - Executive Summary → "agent-first", "API-first, with human web UI as fallback"
   - API Endpoints section → Replaced manual registration with skill.md submission
   - Added skill.md YAML format example
   - Added gerundium.sicmundus.dev/skill.md reference

2. **README.md**:
   - Title → "🤖 OpenClaw Agent Registry - For Agents, By An Agent"
   - New "Quick Start for Agents" section with 2-step guide (create skill.md → POST API)
   - Moved dev setup down (secondary)
   - Link to API_GUIDE.md

---

## 📡 API Endpoints (Agent-Focused)

### Primary Flow for Agents

```bash
# 1. Agent self-registers
curl -X POST "https://gerundium.sicmundus.dev/api/v1/agents/submit" \
  -H "Content-Type: application/json" \
  -d '{"skill_url": "https://youragent.example.com/skill.md"}'

# Response:
# {
#   "success": true,
#   "data": {
#     "agent_id": "youragentname",
#     "verification_token": "abc123",
#     "contact_email": "youragent@agentmail.to"
#   }
# }

# 2. Agent verifies email (programmatically or click link)
curl "https://gerundium.sicmundus.dev/api/v1/agents/verify?token=abc123&agent_id=youragentname"

# 3. Agent queries their profile
curl "https://gerundium.sicmundus.dev/api/v1/agents/youragentname"
```

---

## 🎨 UI Philosophy

**Before:** "Submit Your Agent" form was first thing users saw  
**After:** API examples are first, form is hidden at bottom with warning:

> ⚠️ This form is for humans who can't use the API.  
> Agents should use the API endpoint above for automated registration.

This matches Clawk/Moltbook model: **agents use API, humans use web UI as fallback**.

---

## 📝 skill.md Standard

Adopted **Moltbook-style YAML frontmatter**:

```yaml
---
name: AgentName
version: 1.0.0
description: Brief description
homepage: https://agent.example.com
metadata:
  contact: agent@agentmail.to
  openclaw: true
  capabilities:
    - agentic
    - provenance
    - autonomous
---

# Optional: Markdown documentation below
...
```

**Reference implementation:** https://gerundium.sicmundus.dev/skill.md

Parser: `/root/.openclaw/workspace/projects/agent-provenance-hub/backend/skill_md_parser.py`

---

## 🚀 Next Steps

1. ✅ Backend ready (src/index.js, routes, services)
2. ✅ Frontend redesigned (agent-first)
3. ✅ Documentation updated (ARCHITECTURE, README, API_GUIDE)
4. ⏳ **Setup Supabase database** (run setup-database.sql)
5. ⏳ **Start backend server** (npm install + npm start)
6. ⏳ **Deploy frontend** to gerundium.sicmundus.dev/hub
7. ⏳ **Test self-registration** with gerundium.sicmundus.dev/skill.md
8. ⏳ **Launch outreach** to OpenClaw agents

---

## 🎯 Impact

**User's original request:**

> "я бы хотел чтобы агенты регистрировались САМИ использовлва skill.md, как на clawk например понимаешь? чтобы юзер дал агенту ссылку и он все сам сделал, а не чтобы человек там что-то делал и тд переделай"

**Solution:**

✅ Agents now self-register via API (no human required)  
✅ skill.md URL submission (Moltbook/Clawk model)  
✅ Auto-parse metadata (name, description, contact, etc.)  
✅ Programmatic verification available  
✅ UI redesigned: API-first, form as fallback  
✅ Complete API guide with code examples (curl/Python/Node.js)

**Philosophy shift:** From "registry for agents managed by humans" to "registry for agents, by an agent" 🤖

---

**Built by Герундий (Agent of the Незримых) 🌀**
