const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { Buffer } = require('buffer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to check 'url' query param
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);

  if (!req.query.url) {
    return res.status(400).send('Bad request: url query parameter is required');
  }

  if (!req.query.url.startsWith('http://') && !req.query.url.startsWith('https://')) {
    return res.status(400).send('Bad request: url must start with http:// or https://');
  }

  next();
});

// Proxy middleware
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://dummy', // will be overridden dynamically below
    changeOrigin: true,
    selfHandleResponse: true, // we intercept response to rewrite HTML links
    secure: true,
    onProxyReq: (proxyReq, req, res) => {
      // Dynamically set target based on ?url param
      const targetUrl = req.query.url;

      // Update proxyReq path and host dynamically
      proxyReq.path = new URL(targetUrl).pathname + new URL(targetUrl).search;
      proxyReq.setHeader('host', new URL(targetUrl).host);

      console.log('Proxying request to:', targetUrl);

      // Set headers similar to browser
      proxyReq.setHeader(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      );
      proxyReq.setHeader('Accept', req.headers['accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
      proxyReq.setHeader('Accept-Language', req.headers['accept-language'] || 'en-US,en;q=0.9');
      if (req.headers.referer) proxyReq.setHeader('Referer', req.headers.referer);
      if (req.headers.cookie) proxyReq.setHeader('Cookie', req.headers.cookie);
      proxyReq.setHeader('Origin', new URL(targetUrl).origin);
    },
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      console.log(`Received response: ${proxyRes.statusCode} ${proxyRes.statusMessage} for ${req.query.url}`);

      // Only rewrite HTML content
      const contentType = proxyRes.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        let body = responseBuffer.toString('utf8');

        // Rewrite all absolute URLs so they proxy through us
        // e.g. href="https://example.com/foo" => href="https://yourproxy/?url=https://example.com/foo"
        body = body.replace(
          /href="(http[s]?:\/\/[^"]+)"/g,
          (match, p1) => `href="/?url=${encodeURIComponent(p1)}"`
        );
        body = body.replace(
          /src="(http[s]?:\/\/[^"]+)"/g,
          (match, p1) => `src="/?url=${encodeURIComponent(p1)}"`
        );
        // also rewrite form actions, scripts, CSS urls if needed (more complex, but good for many cases)

        return Buffer.from(body, 'utf8');
      }
      // For other content types, just return as is
      return responseBuffer;
    }),
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error: ' + err.message);
    },
    logLevel: 'debug',
  })
);

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
