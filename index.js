const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const url = require('url');

const app = express();

app.use('/', (req, res, next) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Please provide a target URL in the "url" query parameter.');
  }

  // Parse target URL to ensure it's valid
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return res.status(400).send('Invalid target URL.');
  }

  // Create proxy middleware dynamically for this request
  const proxy = createProxyMiddleware({
    target: parsedUrl.origin,
    changeOrigin: true,
    secure: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': parsedUrl.origin,
    },
    pathRewrite: (path, req) => {
      // Strip the /?url= part, forward only the path from the target URL
      return parsedUrl.pathname + parsedUrl.search;
    },
    onProxyReq: (proxyReq, req, res) => {
      // Remove the original query parameter "url" so target site doesn't get confused
      proxyReq.path = parsedUrl.pathname + parsedUrl.search;
    },
    logLevel: 'warn',
  });

  return proxy(req, res, next);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
