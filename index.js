const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/', (req, res, next) => {
  const targetUrl = req.query.url;  // <-- get target URL from query param "url"
  
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return res.status(400).send('Bad request: URL must start with http:// or https://');
  }

  // Dynamically create proxy middleware for this request
  createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    selfHandleResponse: false,
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('origin', 'https://yourappdomain.com'); // Replace with your app domain
      proxyReq.setHeader('x-requested-with', 'XMLHttpRequest');
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error');
    },
  })(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
