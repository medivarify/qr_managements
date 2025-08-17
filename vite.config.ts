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
          'Origin': 'https://api.arduino.cc'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
