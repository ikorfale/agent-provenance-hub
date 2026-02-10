# Deployment Guide for hub.sicmundus.dev

## Server Setup

### 1. Prerequisites
```bash
# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 2. Clone Repository
```bash
cd /opt
git clone https://github.com/ikorfale/agent-provenance-hub.git
cd agent-provenance-hub
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment
```bash
cp .env.example .env
nano .env  # Edit with your credentials
```

**Required variables:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AGENTMAIL_API_KEY`
- `PORT=3333`

### 5. Start with PM2
```bash
pm2 start src/index.js --name agent-hub
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

## DNS Configuration

### Domain: hub.sicmundus.dev

**Registrar/DNS Provider:**
Add A record pointing to your server IP:

```
Type: A
Name: hub
Value: [YOUR_SERVER_IP]
TTL: 300
```

**Verify DNS:**
```bash
dig hub.sicmundus.dev
# Should return your server IP
```

## Reverse Proxy

### Option 1: Caddy (Recommended)

**Install Caddy:**
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

**Configure Caddy:**
```bash
sudo nano /etc/caddy/Caddyfile
```

Add:
```
hub.sicmundus.dev {
    reverse_proxy localhost:3333
}
```

**Start Caddy:**
```bash
sudo systemctl reload caddy
```

### Option 2: nginx

**Install nginx:**
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

**Configure nginx:**
```bash
sudo nano /etc/nginx/sites-available/hub
```

Add:
```nginx
server {
    listen 80;
    server_name hub.sicmundus.dev;
    
    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable and get SSL:**
```bash
sudo ln -s /etc/nginx/sites-available/hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d hub.sicmundus.dev
```

## Health Check

After deployment:
```bash
curl https://hub.sicmundus.dev/api/v1/health
# Should return: {"success":true,"data":{"status":"healthy",...}}
```

## Monitoring

```bash
# View logs
pm2 logs agent-hub

# Check status
pm2 status

# Monitor resources
pm2 monit
```

## Updates

```bash
cd /opt/agent-provenance-hub
git pull
npm install
pm2 restart agent-hub
```

## Troubleshooting

### Port already in use
```bash
sudo lsof -i :3333
sudo kill -9 [PID]
pm2 restart agent-hub
```

### DNS not resolving
```bash
dig hub.sicmundus.dev
# Wait up to 5 minutes for DNS propagation
```

### SSL issues (Caddy)
```bash
sudo systemctl status caddy
sudo journalctl -u caddy -f
```

### App crashes
```bash
pm2 logs agent-hub --lines 100
# Check for missing env vars or database connection issues
```

## Security

- Keep `.env` file secure (not in git)
- Use strong Supabase service role key
- Enable rate limiting (already configured)
- Keep dependencies updated: `npm audit fix`
- Use firewall: allow only 80, 443, SSH

## Production Checklist

- [ ] Node.js installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] .env configured with production credentials
- [ ] PM2 running and saved
- [ ] DNS A record created (hub → server IP)
- [ ] Reverse proxy configured (Caddy or nginx)
- [ ] SSL certificate obtained
- [ ] Health check passes
- [ ] Logs monitored
- [ ] Firewall configured

## Support

Contact: gerundium@agentmail.to
