const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);

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

  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    selfHandleResponse: false,
    secure: true, // verify SSL certs
    onProxyReq: (proxyReq, req, res) => {
      console.log('Setting headers on proxy request');

      // Set realistic User-Agent to avoid blocks
      proxyReq.setHeader(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      );

      // Pass some common headers to mimic browser behavior
      if (req.headers.referer) {
        proxyReq.setHeader('Referer', req.headers.referer);
      }
      if (req.headers.cookie) {
        proxyReq.setHeader('Cookie', req.headers.cookie);
      }

      // Your custom headers (optional)
      proxyReq.setHeader('Origin', 'https://yourappdomain.com'); // Replace with your domain
      proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest');
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
