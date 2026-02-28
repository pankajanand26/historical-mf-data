import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['lodash', 'recharts'],
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // suppress lodash/recharts interop warnings
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
      },
    },
  },
});
