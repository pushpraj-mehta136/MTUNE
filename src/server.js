const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Static File Serving ---
// Serve all files from the 'public' directory.
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// --- API Proxy ---
// All requests to '/api' will be forwarded to the external API server.
app.use('/api', createProxyMiddleware({
  target: 'https://mtuneapi.vercel.app', // The target API
  changeOrigin: true,                    // Needed for virtual-hosted sites
  pathRewrite: {
    '^/api': '/api', // Rewrite path: remove '/api' from the start of the request path
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add any custom headers or logging here if needed in the future
    console.log(`[Proxy] Forwarding request: ${req.method} ${req.path} -> ${proxyReq.host}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error('[Proxy] Error:', err);
    res.writeHead(500, {
      'Content-Type': 'text/plain',
    });
    res.end('Something went wrong with the API proxy.');
  }
}));

// --- SPA Fallback ---
// For any request that doesn't match a static file or the API proxy,
// send back the main index.html file. This is crucial for a single-page app.
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MTUNE running on http://localhost:${PORT}`);
});
