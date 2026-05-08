const path = require('path');
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Resolve Waiter App Path
const waiterAppPath = '/home/u824115399/persistent_assets/waiter';

// 1. STERN STATIC SERVING: Serve assets directly
app.use('/waiter/assets', express.static(path.join(waiterAppPath, 'assets'), {
    immutable: true,
    maxAge: '1y',
    fallthrough: false
}));

// 2. Serve other static files in /waiter/
app.use('/waiter', express.static(waiterAppPath, { fallthrough: true }));

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
