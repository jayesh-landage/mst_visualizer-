import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the C++ backend runs on :8080; /api requests are proxied to it.
const backend = process.env.VITE_BACKEND_URL || 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: backend, changeOrigin: true } } },
  preview: { port: 4173, proxy: { '/api': { target: backend, changeOrigin: true } } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
});
