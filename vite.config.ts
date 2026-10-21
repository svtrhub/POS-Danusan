import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
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

      if (req.url === '/api/save-default-qris' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            let base64Data = body;
            const matches = body.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches[2]) {
              base64Data = matches[2];
            }
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(path.resolve(__dirname, 'public/qris-default.webp'), buffer);
            try {
              fs.writeFileSync(path.resolve(__dirname, 'dist/qris-default.webp'), buffer);
            } catch (_) {}
            try {
              const assetsDir = path.resolve(__dirname, 'src/assets');
              if (!fs.existsSync(assetsDir)) {
                fs.mkdirSync(assetsDir, { recursive: true });
              }
              const fullDataUri = matches ? body : `data:image/webp;base64,${base64Data}`;
              fs.writeFileSync(
                path.resolve(assetsDir, 'defaultQrisData.ts'),
                `export const DEFAULT_QRIS_DATA: string = ${JSON.stringify(fullDataUri)};\n`
              );
            } catch (err) {
              console.error('Failed to write defaultQrisData.ts:', err);
            }
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, bytes: buffer.length }));
            return;
          } catch (e) {
            console.error('Failed to save default qris:', e);
          }
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'invalid data' }));
        });
        return;
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
