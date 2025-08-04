const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/', (req, res, next) => {
  const targetUrl = req.query.url;

  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return res.status(400).send('Bad request: url query parameter is required and must start with http:// or https://');
  }

  createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    selfHandleResponse: false,
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('origin', 'https://yourappdomain.com'); // replace with your app domain
      proxyReq.setHeader('x-requested-with', 'XMLHttpRequest');
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error');
    },
    pathRewrite: {
      '^/': '/', // keep path as-is
    },
  })(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
