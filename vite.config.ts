import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, Plugin} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const swMimePlugin: Plugin = {
  name: 'sw-mime-fix',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.startsWith('/sw.js')) {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
      next();
    });
  },
};

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), swMimePlugin],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
