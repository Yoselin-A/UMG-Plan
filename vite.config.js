import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Nombre elegido para el repositorio: UMG-Plan
// Si cambias el nombre del repositorio, modifica también /UMG-Plan/.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/UMG-Plan/' : '/',
  server: { host: '0.0.0.0', port: 5173 },
});
