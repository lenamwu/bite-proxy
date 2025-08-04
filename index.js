const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  // Remove leading slash from path and decode URI component
  const targetUrl = decodeURIComponent(req.url.substring(1));

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return res.status(400).send('Bad request: URL must start with http:// or https://');
  }

  createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    selfHandleResponse: false,
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('origin', 'https://yourappdomain.com'); // replace with your domain
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
