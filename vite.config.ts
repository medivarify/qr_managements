import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/arduino': {
        target: 'https://api.arduino.cc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/arduino/, ''),
        secure: true,
        headers: {
          'Origin': 'http://localhost:5173',
          'User-Agent': 'QR-Management-System/1.0',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
        },
        onProxyReq: (proxyReq, req, res) => {
          // Handle preflight OPTIONS requests
          if (req.method === 'OPTIONS') {
            res.writeHead(200, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
              'Access-Control-Max-Age': '86400'
            });
            res.end();
            return;
          }
          
          // Add required headers for Arduino Cloud API
          proxyReq.setHeader('Accept', 'application/json');
          proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({ error: 'Proxy connection failed' }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            // Add CORS headers to all responses
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
