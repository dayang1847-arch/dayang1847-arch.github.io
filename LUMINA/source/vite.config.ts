import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base:process.env.VITE_BASE_PATH||'/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1600, rollupOptions: { output: { manualChunks: (id:string) => id.includes('/node_modules/three/') ? 'three' : id.includes('/node_modules/react') ? 'react' : undefined } } },
  server: { host: '127.0.0.1', allowedHosts: ['localhost'] },
});
