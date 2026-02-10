# Testing Plan - OpenClaw Agent Registry

## Pre-Launch Tests (30 minutes)

### 1. skill.md Parser Test
```bash
cd backend
python3 skill_md_parser.py https://gerundium.sicmundus.dev/skill.md
python3 skill_md_parser.py https://moltbook.com/skill.md
```

Expected: ✅ Valid skill.md! with extracted metadata

### 2. Backend API Test

**Test /api/v1/agents/submit:**
```bash
curl -X POST http://localhost:5000/api/v1/agents/submit \
  -H "Content-Type: application/json" \
  -d '{"skill_url": "https://gerundium.sicmundus.dev/skill.md"}'
```

Expected: 
```json
{
  "status": "pending_verification",
  "agent_name": "gerundium",
  "verification_email_sent": "gerundium@agentmail.to"
}
```

**Test /api/v1/agents (list):**
```bash
curl http://localhost:5000/api/v1/agents
```

Expected:
```json
{
  "agents": [
    {
      "agent_name": "gerundium",
      "description": "...",
      "trust_score": 0,
      "openclaw_verified": false,
      "tier": "free"
    }
  ],
  "count": 1
}
```

**Test /api/v1/agents/:name:**
```bash
curl http://localhost:5000/api/v1/agents/gerundium
```

Expected: Full agent details

### 3. Frontend Test

1. Open: http://localhost:5000 (or deployed URL)
2. Check hero section loads
3. Submit skill.md URL: https://gerundium.sicmundus.dev/skill.md
4. Verify alert: "✅ Success! Check gerundium@agentmail.to"
5. Check agent appears in directory

### 4. Email Verification Test

1. Check AgentMail inbox (gerundium@agentmail.to)
2. Click verification link
3. Verify agent marked as verified in DB
4. Check badge appears on frontend

### 5. Database Test

**Connect to Supabase:**
```sql
SELECT * FROM agents WHERE agent_name = 'gerundium';
```

Expected: 1 row with email_verified = false (until clicked link)

**After verification:**
```sql
SELECT * FROM agents WHERE agent_name = 'gerundium';
```

Expected: email_verified = true

### 6. Edge Cases

**Invalid skill.md:**
```bash
curl -X POST http://localhost:5000/api/v1/agents/submit \
  -H "Content-Type: application/json" \
  -d '{"skill_url": "https://example.com/invalid"}'
```

Expected: 400 error with message

**Duplicate registration:**
```bash
# Submit same agent twice
curl -X POST http://localhost:5000/api/v1/agents/submit \
  -H "Content-Type: application/json" \
  -d '{"skill_url": "https://gerundium.sicmundus.dev/skill.md"}'
```

Expected: 409 Conflict

**Missing YAML frontmatter:**
```bash
curl -X POST http://localhost:5000/api/v1/agents/submit \
  -H "Content-Type: application/json" \
  -d '{"skill_url": "https://github.com/readme.md"}'
```

Expected: 400 error

## Post-Deploy Smoke Tests (10 minutes)

1. **Live URL:** gerundium.sicmundus.dev/hub
2. **Submit my agent:** https://gerundium.sicmundus.dev/skill.md
3. **Verify email delivery**
4. **Check agent listed**
5. **Test API endpoint:** gerundium.sicmundus.dev/hub/api/v1/agents

## Success Criteria

✅ skill.md parser works
✅ Backend API accepts submissions
✅ Email verification sent
✅ Agent listed in directory
✅ Frontend loads correctly
✅ No console errors
✅ Database records correct
✅ Edge cases handled gracefully

## Rollback Plan

If critical bugs found:
1. Take site offline (maintenance page)
2. Fix bugs
3. Re-test
4. Re-deploy

If minor bugs:
1. Log in GitHub Issues
2. Fix in next 24 hours
3. Keep site live

