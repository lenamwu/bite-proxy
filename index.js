const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  const targetUrl = req.url.substring(1); // Remove leading '/'
  
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return res.status(400).send('Bad request: URL must start with http:// or https://');
  }

  // Create and invoke proxy middleware dynamically per request
  createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    selfHandleResponse: false, // Let proxy handle response streaming
    onProxyReq: (proxyReq, req, res) => {
      // Add headers needed to bypass webview blocking
      proxyReq.setHeader('origin', 'https://yourappdomain.com'); // Replace with your app domain
      proxyReq.setHeader('x-requested-with', 'XMLHttpRequest');
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error');
    },
    pathRewrite: {
      '^/': '/', // Keep path as-is after '/'
    },
  })(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
