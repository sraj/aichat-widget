import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AIChatWidget',
      formats: ['es', 'umd'],
      fileName: (format) => `ai-chat-widget.${format}.js`,
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled for NPM distribution
      // For CDN build, we'll bundle everything
      external: [],
      output: {
        // Provide global variables for UMD build
        globals: {},
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@aichat-widget/shared': resolve(__dirname, '../shared/src'),
      '@aichat-widget/ui': resolve(__dirname, '../ui/src'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
});
