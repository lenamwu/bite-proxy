const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/', (req, res, next) => {
  const targetUrl = req.query.url;

  // Validate URL
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return res.status(400).send('Bad request: url query parameter is required and must start with http:// or https://');
  }

  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    selfHandleResponse: true, // intercept response to modify headers/body
    onProxyReq: (proxyReq) => {
      // Add headers to mimic browser and avoid blocking
      proxyReq.setHeader('origin', 'https://yourappdomain.com'); // Replace with your actual domain
      proxyReq.setHeader('x-requested-with', 'XMLHttpRequest');
      proxyReq.setHeader('referer', targetUrl);
      proxyReq.setHeader('user-agent', 'Mozilla/5.0 (compatible; BiteProxy/1.0)');
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error');
    },
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      // Rewrite Set-Cookie headers to remove SameSite and Secure flags that can break cookies through proxy
      if (proxyRes.headers['set-cookie']) {
        proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie =>
          cookie
            .replace(/; ?SameSite=(Lax|Strict|None)/gi, '') // remove SameSite attribute
            .replace(/; ?Secure/gi, '')                     // remove Secure flag if you're using http
            // Optionally, adjust cookie domain/path if needed here
        );
      }

      // Loosen Content-Security-Policy to allow loading resources through proxy
      if (proxyRes.headers['content-security-policy']) {
        // This replaces the default-src, script-src, style-src, img-src, connect-src directives to '*'
        proxyRes.headers['content-security-policy'] = proxyRes.headers['content-security-policy']
          .replace(/(default-src|script-src|style-src|img-src|connect-src)[^;]*/gi, '$1 *');
      }

      // Also loosen other security headers if present
      if (proxyRes.headers['clear-site-data']) {
        delete proxyRes.headers['clear-site-data'];
      }
      if (proxyRes.headers['strict-transport-security']) {
        delete proxyRes.headers['strict-transport-security'];
      }
      if (proxyRes.headers['x-frame-options']) {
        delete proxyRes.headers['x-frame-options'];
      }
      if (proxyRes.headers['x-content-type-options']) {
        delete proxyRes.headers['x-content-type-options'];
      }

      // Return the original response body buffer unmodified
      return responseBuffer;
    }),
  });

  proxy(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
