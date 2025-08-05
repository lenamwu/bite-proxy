const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);

  // Expect URL in query param 'url', e.g. /?url=https://example.com
  const targetUrl = req.query.url;

  if (!targetUrl) {
    console.error('No url query parameter provided');
    return res.status(400).send('Bad request: url query parameter is required');
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    console.error('Invalid url protocol:', targetUrl);
    return res.status(400).send('Bad request: URL must start with http:// or https://');
  }

  console.log('Proxying to:', targetUrl);

  // Create proxy middleware dynamically for this target
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    selfHandleResponse: false,
    onProxyReq: (proxyReq) => {
      console.log('Setting headers on proxy request');
      proxyReq.setHeader('origin', 'https://yourappdomain.com'); // replace with your actual domain
      proxyReq.setHeader('x-requested-with', 'XMLHttpRequest');
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`Received response from target: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error: ' + err.message);
    },
    logLevel: 'debug',
  });

  return proxy(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
