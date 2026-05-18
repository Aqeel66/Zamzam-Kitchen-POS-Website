const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const app = express();

// --- WAITER APP SERVING (FIXED & PRIORITIZED) ---
const waiterAppPaths = [
  path.resolve(__dirname, '../../waiter_react/dist'), // 1. Local Git Path (Prioritize)
  '/home/u824115399/persistent_assets/waiter', // 2. Hostinger Path 1
  '/home/u824115399/domains/zamzamkitchen.net/persistent_assets/waiter', // 3. Hostinger Path 2
];

// Helper to recursively copy directories
function copyDirSync(src, dest) {
  try {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (err) {
    console.error(`⚠️ [WAITER SYNC] Failed to copy from ${src} to ${dest}:`, err.message);
  }
}

// Auto-sync waiter react dist folder with persistent assets on Hostinger
const localGitPath = path.resolve(__dirname, '../../waiter_react/dist');
if (fs.existsSync(path.join(localGitPath, 'index.html'))) {
  console.log('🔄 [WAITER SYNC] Synchronizing Waiter App build from local git to Hostinger persistent storage...');
  const destinations = [
    '/home/u824115399/persistent_assets/waiter',
    '/home/u824115399/domains/zamzamkitchen.net/persistent_assets/waiter'
  ];
  for (const dest of destinations) {
    const parentDir = path.dirname(dest);
    if (fs.existsSync(parentDir)) {
      console.log(`📁 Syncing to: ${dest}`);
      copyDirSync(localGitPath, dest);
    }
  }
  console.log('✅ [WAITER SYNC] Synchronization complete.');
}

let waiterAppPath = waiterAppPaths[0]; // Default to local
for (const p of waiterAppPaths) {
  if (fs.existsSync(path.join(p, 'index.html'))) {
    waiterAppPath = p;
    break;
  }
}

console.log(`📦 [WAITER] Serving from: ${waiterAppPath}`);

// 1. Redirect /waiter to /waiter/ for consistent relative path resolution
app.get('/waiter', (req, res, next) => {
  if (!req.url.endsWith('/')) {
    return res.redirect(301, req.url + '/');
  }
  next();
});

// 2. Static Assets (Must be before the SPA catch-all)
app.use('/waiter/assets', express.static(path.join(waiterAppPath, 'assets'), {
  immutable: true,
  maxAge: '1y',
  fallthrough: true
}));

// 3. SPA Routing
app.all(/^\/waiter($|\/.*)/, (req, res, next) => {
  if (req.path.includes('/api/')) return next();
  if (req.path.includes('/assets/')) return next();
  
  const indexPath = path.join(waiterAppPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});
// ---------------------------------------------------
const PORT = process.env.PORT || 5000;
const pool = require('./db');
const syncSchema = require('./schemaSync');


// Diagnostics
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

const os = require('os');

// SAFE STORAGE INITIALIZATION: Try home directory, but fallback to local path to prevent 503 crashes
let STORAGE_ROOT;
try {
  // On some shared hosts, os.homedir() might be restricted or point to root
  const home = os.homedir();
  if (home && home !== '/') {
    STORAGE_ROOT = path.join(home, '.zamzam_rms_storage');
  } else {
    throw new Error('Invalid home directory');
  }
} catch (e) {
  console.warn('⚠️ Home directory restricted, falling back to application-relative storage.');
  STORAGE_ROOT = path.join(__dirname, '../../zamzam_persistent_storage');
}

const ASSETS_STORAGE = path.join(STORAGE_ROOT, 'assets');
const MENU_ITEMS_STORAGE = path.join(ASSETS_STORAGE, 'menu_items');

// Initialize permanent storage structure with safety checks
console.log('📂 Initializing Asset Storage...');
[STORAGE_ROOT, ASSETS_STORAGE, MENU_ITEMS_STORAGE].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Storage initialized at: ${dir}`);
    }
  } catch (e) {
    console.error(`❌ Storage initialization failed for ${dir}:`, e.message);
    // If we can't even create a local fallback, we're in trouble, but let's try to keep the server alive
  }
});

const legacyAssetsPath = path.join(__dirname, '../assets');
const legacyPersistentPath = path.join(__dirname, '../persistent_assets');
const webPath = path.join(__dirname, '../public');

// Optimized serving with prioritized lookups and error safety
const serveAsset = (req, res, next) => {
  try {
    const assetUrl = req.path;
    
    // Potential locations in priority order
    let locations = [
      path.join(ASSETS_STORAGE, assetUrl),
      path.join(legacyAssetsPath, assetUrl),
      path.join(legacyPersistentPath, assetUrl)
    ];

    // If initial locations don't exist, try stripping prefixes (like /images/menu_items/)
    // This handles cases where DB paths don't perfectly match storage structure
    const segments = assetUrl.split('/').filter(Boolean);
    if (segments.length > 1) {
      const filename = segments[segments.length - 1];
      locations.push(
        path.join(ASSETS_STORAGE, filename),
        path.join(ASSETS_STORAGE, 'menu_items', filename),
        path.join(ASSETS_STORAGE, 'images/menu_items', filename),
        path.join(legacyAssetsPath, filename)
      );
    }

    const validLocations = locations.filter(loc => {
      try {
        return fs.existsSync(loc) && fs.lstatSync(loc).isFile();
      } catch (e) {
        return false;
      }
    });

    if (validLocations.length > 0) {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(validLocations[0]);
    }
  } catch (err) {
    console.error('🔥 ASSET SERVE ERROR:', err.message);
  }
  next();
};

app.use('/assets', serveAsset);
const websiteDistPath = path.join(__dirname, '../../website/dist');
app.use(express.static(websiteDistPath));
app.use(express.static(webPath));

// Fallback for 404 assets
app.use('/assets', (req, res) => {
  console.warn(`⚠️ Asset Not Found: ${req.originalUrl}`);
  res.status(404).send('Asset not found');
});

// Serve web frontend
app.use(express.static(webPath));

app.use('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Zamzam Kitchen API is running', timestamp: new Date() });
});

app.use('/api/waiter-diagnostics', (req, res) => {
  const localGitPath = path.resolve(__dirname, '../../waiter_react/dist');
  const destinations = [
    '/home/u824115399/persistent_assets/waiter',
    '/home/u824115399/domains/zamzamkitchen.net/persistent_assets/waiter'
  ];
  
  const getDirInfo = (dirPath) => {
    try {
      if (!fs.existsSync(dirPath)) return { exists: false };
      const stats = fs.statSync(dirPath);
      const files = fs.readdirSync(dirPath);
      const fileDetails = files.map(f => {
        const fp = path.join(dirPath, f);
        const fstats = fs.statSync(fp);
        return {
          name: f,
          size: fstats.size,
          mtime: fstats.mtime,
          isDir: fstats.isDirectory()
        };
      });
      return {
        exists: true,
        path: dirPath,
        mtime: stats.mtime,
        files: fileDetails
      };
    } catch (err) {
      return { exists: true, error: err.message };
    }
  };

  const localInfo = getDirInfo(localGitPath);
  const destInfo = destinations.map(d => ({ path: d, info: getDirInfo(d) }));
  
  // Read served index.html content to see what JS file it requests
  let servedIndexSnippet = null;
  try {
    const servedIndexPath = path.join(waiterAppPath, 'index.html');
    if (fs.existsSync(servedIndexPath)) {
      const content = fs.readFileSync(servedIndexPath, 'utf8');
      servedIndexSnippet = content.substring(0, 1000); // return first 1000 chars
    }
  } catch (err) {
    servedIndexSnippet = `Error reading index.html: ${err.message}`;
  }

  const websitePath = path.join(__dirname, '../public/index.html');
  const websitePathExists = fs.existsSync(websitePath);

  res.json({
    timestamp: new Date(),
    processCwd: process.cwd(),
    __dirname,
    activeWaiterAppPath: waiterAppPath,
    localGitPath,
    localInfo,
    destInfo,
    servedIndexSnippet,
    websitePath,
    websitePathExists
  });
});

// API Request Logger (Debugging 405)
app.use('/api', (req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
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
  if (req.path.includes('/api/') || req.path.includes('/assets/')) {
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

// Legacy Waiter App routing removed. New routing is handled at the top of the file.
// SPA Routing for Waiter App is now handled by the Root Entry Point
// to ensure persistent asset serving. No action needed here.

// Handle Main Website routing (Root /)
app.get(/.*/, (req, res, next) => {
  // CRITICAL: Do NOT catch /waiter! The root entry point handles that.
  if (req.path.startsWith('/waiter')) {
    return next();
  }
  
  // Exclude API routes
  if (req.path.startsWith('/api')) {
    return next();
  }

  const possiblePaths = [
    path.join(__dirname, '../public/index.html'),
    path.join(__dirname, '../../website/dist/index.html'),
    path.join(__dirname, '../../../../public_html/index.html'),
    path.join(__dirname, '../../../public_html/index.html'),
    '/home/u824115399/domains/zamzamkitchen.net/public_html/index.html'
  ];
  
  const websitePath = possiblePaths.find(p => {
    try {
      return fs.existsSync(p);
    } catch (e) {
      return false;
    }
  });

  if (websitePath) {
    res.sendFile(websitePath);
  } else {
    console.warn(`[WEBSITE ROUTE] index.html not found. Checked paths:`, possiblePaths);
    res.status(404).send('Website not found');
  }
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
  
  // Run Auto-Sync and start reservation cron in the background
  setImmediate(async () => {
    try {
      console.log('🛠️ Starting Database Auto-Sync...');
      await syncSchema();
      console.log('✅ Database Auto-Sync complete.');
      
      // Initialize background worker for reservation auto-no-show grace period check
      const { startReservationCron } = require('./services/reservationCron');
      startReservationCron();
    } catch (error) {
      console.error('🔥 CRITICAL: Background startup task failed!', error);
    }
  });
});

// Increase timeout for long-running DB sync operations
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
