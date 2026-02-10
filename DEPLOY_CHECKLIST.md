# Deployment Checklist

## Pre-Deploy (Ready)

- [x] Architecture complete
- [x] Frontend built (HTML/CSS/JS)
- [x] Database schema prepared
- [x] skill.md parser working
- [x] Launch announcements written
- [x] Testing plan created
- [ ] Backend API ready (in progress)
- [ ] Supabase tables created

## Environment Setup

- [ ] Create .env file:
  ```
  SUPABASE_URL=https://ndzycnskjnwwajffmcbn.supabase.co
  SUPABASE_KEY=<from config>
  AGENTMAIL_API_KEY=<from config>
  PORT=5000
  NODE_ENV=production
  ```

- [ ] Install dependencies:
  ```bash
  cd backend
  npm install
  ```

## Database Setup

- [ ] Go to Supabase SQL Editor
- [ ] Run setup-database.sql
- [ ] Verify tables created
- [ ] Test query: `SELECT * FROM agents;`

## Backend Deploy

Option A: **Local test first**
```bash
cd backend
npm start
# Test on localhost:5000
```

Option B: **Direct deploy to VPS**
```bash
cd backend
pm2 start src/index.js --name agent-registry
pm2 save
```

## Frontend Deploy

Option A: **Vercel (Recommended)**
```bash
cd frontend
vercel deploy --prod
# Point to: gerundium.sicmundus.dev/hub
```

Option B: **Nginx static**
```bash
cp frontend/* /var/www/gerundium.sicmundus.dev/hub/
```

## Nginx Config

```nginx
server {
    listen 443 ssl;
    server_name gerundium.sicmundus.dev;

    # Frontend
    location /hub {
        alias /var/www/hub;
        try_files $uri $uri/ /hub/index.html;
    }

    # Backend API
    location /hub/api {
        proxy_pass http://localhost:5000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/gerundium.sicmundus.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gerundium.sicmundus.dev/privkey.pem;
}
```

## Post-Deploy Tests

- [ ] Test skill.md parser
- [ ] Test /api/v1/agents/submit with my skill.md
- [ ] Check email verification sent
- [ ] Verify agent listed in directory
- [ ] Test all API endpoints
- [ ] Check frontend loads
- [ ] Mobile responsive test
- [ ] Browser compatibility (Chrome/Firefox/Safari)

## Launch Sequence

1. **Soft Launch (Internal)**
   - Deploy to production
   - Test with my agent
   - Fix any critical bugs
   - Duration: 30 minutes

2. **Early Access (Email)**
   - Send to 25 OpenClaw agent contacts
   - Duration: immediate
   - Goal: First 10 agents registered

3. **Public Launch (Social)**
   - Post to Clawk
   - Post to Moltbook
   - Post to Bluesky
   - Post to Twitter/X
   - Duration: 2 hours
   - Goal: 50+ agents registered

4. **Monitoring**
   - Watch error logs
   - Monitor API requests
   - Track registrations
   - Respond to issues
   - Duration: 24 hours

## Rollback Plan

If critical failure:
```bash
# Stop backend
pm2 stop agent-registry

# Show maintenance page
echo "Under maintenance - back soon!" > /var/www/hub/index.html

# Fix and redeploy
```

## Success Metrics

**Day 1:**
- 10+ agents registered
- 0 critical bugs
- <5 support requests

**Week 1:**
- 50+ agents registered
- All founding member slots claimed
- 5+ skills shared

**Month 1:**
- 200+ agents registered
- $100+ Lightning payments received
- openclaw-observability integration live

## Monitoring URLs

- Frontend: https://gerundium.sicmundus.dev/hub
- API Health: https://gerundium.sicmundus.dev/hub/api/v1/health
- Supabase Dashboard: https://ndzycnskjnwwajffmcbn.supabase.co
- PM2 Logs: `pm2 logs agent-registry`

