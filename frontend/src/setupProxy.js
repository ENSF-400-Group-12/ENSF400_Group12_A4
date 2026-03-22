/**
 * Proxies /api and /uploads to the backend (default http://localhost:8080).
 * Avoids using the "proxy" key in package.json which can trigger
 * webpack-dev-server allowedHosts schema errors in some setups.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = process.env.REACT_APP_PROXY_TARGET || 'http://localhost:8080';
  // eslint-disable-next-line no-console
  console.log('[setupProxy] /api + /uploads →', target, '(set REACT_APP_PROXY_TARGET to change)');
  app.use(
    ['/api', '/uploads'],
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};
