const path = require('path');
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Resolve Waiter App Path based on Environment
const waiterAppPaths = [
    path.join(__dirname, 'apps/waiter_react/dist'), // 1. Local Git Path (Prioritize)
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
const localGitPath = path.join(__dirname, 'apps/waiter_react/dist');
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

let waiterAppPath = waiterAppPaths[2]; // Default to local
for (const p of waiterAppPaths) {
    if (fs.existsSync(path.join(p, 'index.html'))) {
        waiterAppPath = p;
        break;
    }
}

console.log(`📦 [WAITER] Serving app from: ${waiterAppPath}`);

// 1. STERN STATIC SERVING: Serve assets directly
app.use('/waiter/assets', express.static(path.join(waiterAppPath, 'assets'), {
    immutable: true,
    maxAge: '1y',
    fallthrough: true // Allow fallthrough to check other paths if needed
}));

// 2. Redirect /waiter to /waiter/ for consistent relative path resolution
app.get('/waiter', (req, res, next) => {
    if (!req.url.endsWith('/')) {
        return res.redirect(301, req.url + '/');
    }
    next();
});

// 3. Serve other static files in /waiter/
app.use('/waiter', express.static(waiterAppPath));

// 3. ABSOLUTE CATCH-ALL for /waiter - Handle this BEFORE loading backend
app.all(['/waiter', '/waiter/*'], (req, res, next) => {
    // Let API requests pass through to the backend
    if (req.path.includes('/api/')) return next();
    
    // Serve assets if it's an asset request
    if (req.path.includes('/assets/')) return next();

    const indexPath = path.join(waiterAppPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    
    res.status(404).send('Waiter App Index Not Found in Persistent Storage');
});

// Attempt to load the rest of the backend
try {
    const backendPath = path.resolve(__dirname, './apps/backend/src/index.js');
    require(backendPath);
} catch (err) {
    console.error('🔥 Root Entry: Failed to load backend:', err);
}
