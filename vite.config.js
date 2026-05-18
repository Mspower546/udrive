import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'client',
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api/': {
        target: 'http://localhost:3000',
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';
            }
          });
        }
      },
      '/auth/': 'http://localhost:3000',
      '/dlink/': 'http://localhost:3000',
      '/share/': 'http://localhost:3000'
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
