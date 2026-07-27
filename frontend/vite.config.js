import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Serves /tonconnect-manifest.json dynamically so the `url` field always
// matches the current request origin (ngrok, localhost, etc.).
// Tonkeeper validates that manifest.url origin === where the manifest was fetched from.
function dynamicManifest() {
  return {
    name: 'dynamic-tonconnect-manifest',
    configureServer(server) {
      server.middlewares.use('/tonconnect-manifest.json', (req, res) => {
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:5173';
        const origin = `${proto}://${host}`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({
          url: origin,
          name: 'TON Meme DEX',
          iconUrl: `${origin}/logo.png`,
        }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), dynamicManifest()],
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
