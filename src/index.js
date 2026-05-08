const path = require('path');
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Resolve Waiter App Path - USING ABSOLUTE SERVER PATH
// This is the most reliable way on Hostinger
const waiterAppPath = '/home/u824115399/persistent_assets/waiter';

console.log(`🚀 Waiter App starting from: ${waiterAppPath}`);

// 1. STERN STATIC SERVING: Serve assets directly
app.use('/waiter/assets', express.static(path.join(waiterAppPath, 'assets'), {
    immutable: true,
    maxAge: '1y',
    fallthrough: false
}));

// 2. Serve other static files in /waiter/
app.use('/waiter', express.static(waiterAppPath, { fallthrough: true }));

// 3. SPA Fallback for /waiter
app.get(/^\/waiter/, (req, res, next) => {
    if (req.path.includes('/api/')) {
        return next();
    }
    
    const indexPath = path.join(waiterAppPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    } else {
        res.status(404).send(`
            <div style="font-family: sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #0d9488;">Zamzam Waiter App - TESTING 123</h1>
                <p>Waiting for files to be uploaded to persistent storage...</p>
                <div style="color: #64748b; font-size: 12px; margin-top: 20px;">
                    Required Path: ${waiterAppPath}
                </div>
            </div>
        `);
    }
});

// Attempt to load the rest of the backend
try {
    const backendPath = path.resolve(__dirname, '../apps/backend/src/index.js');
    require(backendPath);
} catch (err) {
    console.error('🔥 Root Entry: Failed to load backend:', err);
}
