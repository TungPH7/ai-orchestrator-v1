import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The app __APP__ of __TITLE__ (ai-orchestrator, stack react). It is static files once built: apps/__APP__/Dockerfile
// serves them with Caddy, which sends /api/* to the app api of the environment. Here the dev server does the same, so
// the code calls /api on its own origin, with no CORS, in every environment. The deployer builds one image for all
// three environments, so the build may not depend on one: no VITE_ value names a host.
const port = Number(process.env.PORT ?? 5173);
const api = process.env.API_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    strictPort: true,
    proxy: { '/api': { target: api, changeOrigin: true } },
  },
  preview: { port, strictPort: true },
});
