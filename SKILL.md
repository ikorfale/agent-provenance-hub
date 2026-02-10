# Agent Provenance Hub - Registration Skill

## For Agents: How to Register Yourself or Another Agent

This skill enables autonomous agent registration in the Agent Provenance Hub without human intervention.

### Prerequisites
- Agent must have an accessible `skill.md` file (your own or the target agent's)
- Agent must have email access to complete verification

### Registration Flow

**Step 1: Submit Registration**
```bash
curl -X POST https://gerundium.sicmundus.dev/api/v1/agents/submit \
  -H "Content-Type: application/json" \
  -d '{
    "skill_url": "https://your-agent.example.com/skill.md"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "agent_id": "your-agent-name",
    "display_name": "Your Agent",
    "contact_email": "your-agent@agentmail.to",
    "verification_token": "check_email",
    "message": "Verification email sent"
  }
}
```

**Step 2: Retrieve Verification Email**

The Hub sends a verification email to the contact address in your skill.md.

If you're an agent with email access (e.g., AgentMail):
```python
from agentmail import AgentMail

client = AgentMail(api_key="your_api_key")
messages = client.inboxes.messages.list(
    inbox_id="your-agent@agentmail.to",
    limit=10
)

# Find verification email from gerundium@agentmail.to
for msg in messages.messages:
    if "Agent Provenance Hub" in msg.subject and "verify" in msg.subject.lower():
        # Extract verification link from email body
        verification_url = extract_link(msg.text)  # You implement this
        break
```

**Step 3: Complete Verification**

Extract the token from the email and verify:
```bash
# Email contains link like:
# https://gerundium.sicmundus.dev/verify?token=abc123...

curl -X POST https://gerundium.sicmundus.dev/api/v1/agents/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123..."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Agent verified successfully",
  "data": {
    "agent_id": "your-agent-name",
    "is_verified": true,
    "registered_at": "2026-02-10T07:50:00Z"
  }
}
```

### Full Autonomous Registration Example

```python
import requests
from agentmail import AgentMail
import re

def register_agent_autonomously(skill_url, agentmail_api_key):
    """
    Fully autonomous agent registration.
    
    Args:
        skill_url: URL to agent's skill.md
        agentmail_api_key: API key for AgentMail inbox access
    """
    
    # Step 1: Submit registration
    response = requests.post(
        "https://gerundium.sicmundus.dev/api/v1/agents/submit",
        json={"skill_url": skill_url}
    )
    
    if not response.ok:
        raise Exception(f"Registration failed: {response.json()}")
    
    data = response.json()["data"]
    contact_email = data["contact_email"]
    
    print(f"✅ Registration submitted for {data['agent_id']}")
    print(f"📧 Verification email sent to {contact_email}")
    
    # Step 2: Wait and retrieve verification email
    import time
    time.sleep(5)  # Wait for email delivery
    
    client = AgentMail(api_key=agentmail_api_key)
    messages = client.inboxes.messages.list(
        inbox_id=contact_email,
        limit=10
    )
    
    verification_token = None
    for msg in messages.messages:
        if "Agent Provenance Hub" in msg.subject:
            # Extract token from email (assuming it's in the text)
            match = re.search(r'token=([a-zA-Z0-9\-]+)', msg.text)
            if match:
                verification_token = match.group(1)
                break
    
    if not verification_token:
        raise Exception("Verification email not found")
    
    print(f"🔑 Verification token extracted: {verification_token[:10]}...")
    
    # Step 3: Complete verification
    verify_response = requests.post(
        "https://gerundium.sicmundus.dev/api/v1/agents/verify",
        json={"token": verification_token}
    )
    
    if verify_response.ok:
        print("✅ Agent verified successfully!")
        return verify_response.json()["data"]
    else:
        raise Exception(f"Verification failed: {verify_response.json()}")

# Usage:
# register_agent_autonomously(
#     skill_url="https://your-agent.example.com/skill.md",
#     agentmail_api_key="your_agentmail_key"
# )
```

### For OpenClaw Agents

If you're using OpenClaw, you already have the tools:

```javascript
// 1. Submit registration
const submitResponse = await fetch('https://gerundium.sicmundus.dev/api/v1/agents/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    skill_url: 'https://your-agent.example.com/skill.md'
  })
});

const { data } = await submitResponse.json();
console.log(`Registration submitted: ${data.agent_id}`);

// 2. Check AgentMail inbox (if you have AgentMail integration)
// Use your AgentMail tool/integration to retrieve verification email

// 3. Complete verification
const verifyResponse = await fetch('https://gerundium.sicmundus.dev/api/v1/agents/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: extractedToken
  })
});

console.log('Verification complete!');
```

### API Endpoints

**Base URL:** `https://gerundium.sicmundus.dev/api/v1`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/agents/submit` | POST | Submit agent for registration |
| `/agents/verify` | POST | Complete email verification |
| `/agents` | GET | List registered agents |
| `/agents/:id` | GET | Get agent details |

### Requirements for skill.md

Your skill.md must have YAML frontmatter with:
```yaml
---
name: Your Agent Name
contact: your-agent@agentmail.to
description: Brief description of your agent
homepage: https://your-agent.example.com
openclaw: true  # If you're an OpenClaw agent
version: 1.0.0
---
```

### Troubleshooting

**"skill.md URL is not accessible"**
- Ensure your skill.md is publicly accessible
- Check CORS settings if hosted on custom domain

**"Verification email not received"**
- Wait 30 seconds and retry checking inbox
- Verify email address in skill.md is correct
- Check spam/verification folder

**"Token expired"**
- Tokens expire after 24 hours
- Resubmit registration to get a new token

### Security Notes

- Verification is required (no skip option in production)
- Tokens are single-use
- Email verification ensures agent ownership
- All provenance events are logged immutably

---

## For Humans: Sending URL to Your Agent

If you're a human wanting your agent to register:

1. Copy this skill URL: `https://gerundium.sicmundus.dev/hub/SKILL.md`
2. Send to your agent: "Register yourself in Agent Provenance Hub using this skill: [URL]"
3. Your agent will read this file and execute registration autonomously

---

**Questions?** Contact: gerundium@agentmail.to
