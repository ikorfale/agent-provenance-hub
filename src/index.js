require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const agentRoutes = require('./routes/agents');
const trustRoutes = require('./routes/trust');
const paymentRoutes = require('./routes/payments');
const apiKeyRoutes = require('./routes/apiKeys');
const webhookRoutes = require('./routes/webhooks');

// Import middleware and utilities
const { errorHandler } = require('./utils/errors');
const { setupRateLimiting } = require('./middleware/rateLimit');
const { testConnection } = require('./config/database');
const { testConnection: testEmailConnection } = require('./services/emailService');
const { testParser } = require('./services/skillParser');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for static frontend
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: [
    'https://gerundium.sicmundus.dev',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
  credentials: true
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(setupRateLimiting());

// Health check
app.get('/api/v1/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    success: true,
    data: {
      status: dbStatus ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus ? 'healthy' : 'unhealthy',
        email: 'healthy', // We allow email to fail gracefully
        payments: 'disabled' // Not implemented yet
      }
    }
  });
});

// Also support old health check path for compatibility
app.get('/api/hub/v1/health', async (req, res) => {
  res.redirect('/api/v1/health');
});

// API Routes (using /api/v1 prefix to match frontend expectations)
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/trust', trustRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// Legacy route support (for /api/hub/v1 prefix)
app.use('/api/hub/v1/agents', agentRoutes);
app.use('/api/hub/v1/trust', trustRoutes);
app.use('/api/hub/v1/payments', paymentRoutes);
app.use('/api/hub/v1/api-keys', apiKeyRoutes);
app.use('/api/hub/v1/webhooks', webhookRoutes);

// Static files (frontend)
app.use('/hub', express.static(path.join(__dirname, '../public')));

// SPA fallback
app.get('/hub/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/hub');
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('🚀 Initializing OpenClaw Agent Registry...');
    
    // Test database connection
    console.log('📊 Testing database connection...');
    const dbOk = await testConnection();
    if (!dbOk) {
      console.warn('⚠️  Database connection test failed, but continuing...');
    }
    
    // Test email connection
    console.log('📧 Testing email service...');
    await testEmailConnection();
    
    // Test Python parser
    console.log('🐍 Testing Python skill parser...');
    await testParser();
    
    // Start server
    app.listen(PORT, () => {
      console.log('✅ Server started successfully!');
      console.log(``);
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📊 Dashboard: https://gerundium.sicmundus.dev/hub`);
      console.log(`🔗 API: https://gerundium.sicmundus.dev/api/v1`);
      console.log(``);
      console.log(`Endpoints:`);
      console.log(`  POST /api/v1/agents/submit - Submit agent via skill.md`);
      console.log(`  GET  /api/v1/agents - List all agents`);
      console.log(`  GET  /api/v1/agents/:name - Get agent details`);
      console.log(`  GET  /api/v1/agents/verify - Verify email`);
      console.log(`  GET  /api/v1/trust/:agent_id - Get trust score`);
      console.log(`  GET  /api/v1/health - Health check`);
      console.log(``);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
