const path = require('path');
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Resolve Waiter App Path based on Environment
const waiterAppPaths = [
    '/home/u824115399/persistent_assets/waiter', // Hostinger Path 1
    '/home/u824115399/domains/zamzamkitchen.net/persistent_assets/waiter', // Hostinger Path 2
    path.join(__dirname, 'apps/waiter_react/dist') // Local Path
];

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
