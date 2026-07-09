import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@aichat-widget/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url)
      ),
    },
  },
  server: {
    port: 3100,
    strictPort: true,
    open: true,
    fs: {
      allow: ['..'],
    },
  },
});
