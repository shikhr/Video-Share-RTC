import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  server: {
    host: '127.0.0.1',

    proxy: {
      '/socket.io/': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/api/': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
