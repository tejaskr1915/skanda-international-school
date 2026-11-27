require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const portalAuthRoutes = require('./routes/portalAuthRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const branchAdminRoutes = require('./routes/branchAdminRoutes');
const rolePortalRoutes = require('./routes/rolePortalRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const transportRoutes = require('./routes/transportRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const kioskRoutes = require('./routes/kioskRoutes');
const noDuesRoutes = require('./routes/noDuesRoutes');
const commsRoutes = require('./routes/commsRoutes');
const whatsappWebhookRoutes = require('./routes/whatsappWebhookRoutes');
const labRoutes = require('./routes/labRoutes');
const activityRoutes = require('./routes/activityRoutes');
const rolloverRoutes = require('./routes/rolloverRoutes');
const academicsExtendedRoutes = require('./routes/academicsExtendedRoutes');
const financeDocRoutes = require('./routes/financeDocRoutes');
const placementRoutes = require('./routes/placementRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Helper to detect active Wi-Fi / LAN IPv4 address
function getNetworkIPv4() {
  const interfaces = os.networkInterfaces();
  let fallbackIp = null;

  for (const [name, netInterface] of Object.entries(interfaces)) {
    if (!netInterface) continue;
    for (const iface of netInterface) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const lowerName = name.toLowerCase();
        if (
          lowerName.includes('wi-fi') ||
          lowerName.includes('wifi') ||
          lowerName.includes('wlan') ||
          lowerName.includes('wireless') ||
          lowerName.includes('eth') ||
          lowerName.includes('en')
        ) {
          return iface.address;
        }
        if (!fallbackIp) {
          fallbackIp = iface.address;
        }
      }
    }
  }

  return fallbackIp || '127.0.0.1';
}

// Dynamic CORS configuration allowing localhost and private LAN IPv4 subnets
const LAN_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/;

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, Postman) where origin is undefined
    if (!origin || LAN_ORIGIN_REGEX.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-branch-id']
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve exported Expo Web app if dist exists
const fs = require('fs');
const distPath = path.join(__dirname, '../../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/academic', applicationRoutes); // alias for academic metadata
app.use('/api/portal-auth', portalAuthRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/branch-admin', branchAdminRoutes);
app.use('/api/portal', rolePortalRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/hostel', hostelRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/no-dues', noDuesRoutes);
app.use('/api/comms', commsRoutes);
app.use('/api/webhooks/whatsapp', whatsappWebhookRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/rollover', rolloverRoutes);
app.use('/api/academics-ext', academicsExtendedRoutes);
app.use('/api/finance-docs', financeDocRoutes);
app.use('/api/placement', placementRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Skanda International School Admissions API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Single Page Application (SPA) fallback for client routes on Web
if (fs.existsSync(distPath)) {
  app.use((req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API Route not found: ${req.method} ${req.url}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

const isDirectExecution = require.main === module || (require.main && require.main.filename && (require.main.filename.endsWith('index.js') || require.main.filename.endsWith('server.js')));

if (process.env.NODE_ENV !== 'test' && isDirectExecution) {
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    const lanIp = getNetworkIPv4();
    console.log(`====================================================`);
    console.log(`  Skanda International School Backend Server`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://${lanIp}:${PORT}`);
    console.log(`  Health:  http://${lanIp}:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
