const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy middleware: add headers here as needed
app.use('/', createProxyMiddleware({
  target: 'https://', // You can dynamically set this in your app or here as a fallback
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // Add headers here, e.g.:
    proxyReq.setHeader('origin', 'https://yourappdomain.com');
    proxyReq.setHeader('x-requested-with', 'XMLHttpRequest');
  },
  onError: (err, req, res) => {
    res.status(500).send('Proxy error');
  },
  router: (req) => {
    // Example: dynamically change target based on req.url if needed
    // For now just forward the request URL after '/'
    const url = req.url.substring(1); // Remove leading '/'
    return url.startsWith('http') ? url : 'https://' + url;
  }
}));

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
