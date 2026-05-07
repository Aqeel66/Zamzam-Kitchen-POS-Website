const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const app = express();
const PORT = process.env.PORT || 5000;
const pool = require('./db');
const syncSchema = require('./schemaSync');


// Diagnostics
const fs = require('fs');
const pathsToCheck = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), 'production.env'),
  path.resolve(process.cwd(), 'config.env')
];

console.log('📂 Current Working Directory:', process.cwd());
let foundEnv = false;
for (const p of pathsToCheck) {
  console.log('🔍 Checking .env at:', p);
  if (fs.existsSync(p)) {
    console.log('✅ .env file found at:', p);
    require('dotenv').config({ path: p });
    foundEnv = true;
    break;
  }
}

if (!foundEnv) {
  console.warn('⚠️ .env file NOT found in any known locations! Using default environment variables.');
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const assetsPath = path.join(__dirname, '../assets');
const webPath = path.join(__dirname, '../public');

const imagesPath = path.join(assetsPath, 'images');
const menuItemsPath = path.join(imagesPath, 'menu_items');

// Ensure upload directories exist
[assetsPath, imagesPath, menuItemsPath].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  } catch (err) {
    console.error(`⚠️ Could not create directory ${dir}:`, err.message);
  }
});

console.log('📂 Serving static assets from:', assetsPath);
console.log('🌐 Serving web files from:', webPath);
if (!fs.existsSync(webPath)) {
  console.error('❌ CRITICAL: Public folder not found!');
}

app.use('/assets', express.static(assetsPath, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  }
}));

// Log 404s for assets specifically to help debugging
app.use('/assets', (req, res) => {
  console.warn(`❌ 404 Not Found (Asset): ${req.originalUrl}`);
  res.status(404).send('Asset not found');
});

app.use(express.static(webPath));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Zamzam Kitchen API is running', timestamp: new Date() });
});

// Route Imports
const reservationRoutes = require('./routes/reservations');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const tableRoutes = require('./routes/tables');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const permissionRoutes = require('./routes/permissions');
const hrRoutes = require('./routes/hr');
const messageRoutes = require('./routes/messages');
const settingRoutes = require('./routes/settings');
const paymentGatewayRoutes = require('./routes/payment_gateways');
const messagingSettingsRoutes = require('./routes/messaging_settings');
const emailSettingsRoutes = require('./routes/email_settings');
const inventoryRoutes = require('./routes/inventory');
const purchasesRoutes = require('./routes/purchases');
const reportsRoutes = require('./routes/reports'); 
const expensesRoutes = require('./routes/expenses');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const promotionRoutes = require('./routes/promotions');

app.use('/api/reservations', reservationRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/payment-gateways', paymentGatewayRoutes);
app.use('/api/messaging-settings', messagingSettingsRoutes);
app.use('/api/email-settings', emailSettingsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/promotions', promotionRoutes);

// Handle POS Terminal routing (Sub-folder /pos)
app.get(/^\/pos/, (req, res, next) => {
  // If it's an API or Assets route, let it pass through to the 404 handler if not found
  if (req.path.startsWith('/api') || req.path.startsWith('/assets')) {
    return next();
  }
  
  // Serve the POS index.html for any path starting with /pos
  const indexPath = path.join(webPath, 'pos/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error sending POS index.html:', err);
      next();
    }
  });
});

// Handle Main Website routing (Root /)
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/assets')) {
    return next();
  }
  
  // Serve the main website index.html
  const indexPath = path.join(webPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error sending Website index.html:', err);
      next();
    }
  });
});

// 404 Logger for debugging missing assets
app.use((req, res, next) => {
  if (req.url.startsWith('/assets')) {
    console.warn(`❌ 404 Not Found (Asset): ${req.url}`);
  } else {
    console.log(`❓ 404 Not Found (API/Route): ${req.method} ${req.url}`);
  }
  res.status(404).json({ success: false, message: `Route ${req.url} not found` });
});

// Final error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Handle Process Events for Debugging Crash Loop
process.on('exit', (code) => {
  console.log(`👋 Process exiting with code: ${code}`);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT. Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM. Shutting down...');
  process.exit(0);
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Run Auto-Sync in the background so we don't block the port binding
  setImmediate(async () => {
    try {
      console.log('🛠️ Starting Database Auto-Sync...');
      await syncSchema();
      console.log('✅ Database Auto-Sync complete.');
    } catch (error) {
      console.error('🔥 CRITICAL: Database Auto-Sync failed!', error);
    }
  });
});

// Increase timeout for long-running DB sync operations
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
