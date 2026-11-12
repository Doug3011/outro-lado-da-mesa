import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Versão mostrada na tela inicial (Home.tsx) — lê de desktop/package.json
// (o arquivo que de fato é bumpado a cada release, ver build-installer.ps1),
// não do package.json da raiz (esse fica parado em "0.1.0").
const desktopPkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./desktop/package.json', import.meta.url)), 'utf-8'),
);

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(desktopPkg.version),
  },
  server: {
    port: 5173,
    host: true,
  },
});
