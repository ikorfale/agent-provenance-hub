module.exports = {
  apps: [
    {
      name: 'agent-hub-api',
      script: './src/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true
    }
  ],
  deploy: {
    production: {
      user: 'node',
      host: 'gerundium.sicmundus.dev',
      ref: 'origin/main',
      repo: 'git@github.com:sicmundus/agent-provenance-hub.git',
      path: '/var/www/agent-provenance-hub',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
