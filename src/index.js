const path = require('path');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Attempt to load the backend
let backendError = null;
try {
    const backendPath = path.resolve(__dirname, '../apps/backend/src/index.js');
    console.log(`🔍 Root Entry: Attempting to load backend from ${backendPath}`);
    require(backendPath);
    // If require(backendPath) starts its own server on the same app object or another port, 
    // it will handle the requests.
} catch (err) {
    backendError = err;
    console.error('🔥 Root Entry: Failed to load backend:', err);
}

// Diagnostic Page - Served if the backend fails to load
if (backendError) {
    app.get('*', (req, res) => {
        res.status(500).send(`
            <div style="font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto;">
                <h1 style="color: #e11d48;">🔥 Zamzam RMS: Critical Startup Error</h1>
                <p>The backend application failed to initialize. Here is the diagnostic information:</p>
                <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; font-family: monospace; white-space: pre-wrap;">
<b>Error:</b> ${backendError.message}

<b>Stack Trace:</b>
${backendError.stack}
                </div>
                <p style="margin-top: 20px; color: #64748b;">Working Directory: ${process.cwd()}<br>
                File Path: ${__filename}</p>
            </div>
        `);
    });

    app.listen(PORT, () => {
        console.log(`🚀 Root Bridge listening on port ${PORT} due to backend failure`);
    });
} else {
    console.log('✅ Root Bridge: Backend loaded successfully.');
}
