const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { createProxyMiddleware } = require('http-proxy-middleware');

const config = getDefaultConfig(__dirname);

// Proxy API requests to backend server in web mode (avoids CORS)
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://192.168.1.31:7008';

const proxyMiddleware = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '/api' },
  logLevel: 'warn',
});

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url?.startsWith('/api/')) {
        return proxyMiddleware(req, res, next);
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = withNativeWind(config, {
  input: './global.css',
  inlineCss: true,
});
