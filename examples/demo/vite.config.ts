import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      'md4ai/core': resolve(__dirname, '../../src/core.ts'),
      'md4ai/react': resolve(__dirname, '../../src/react.ts'),
      'md4ai': resolve(__dirname, '../../src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        showcase: resolve(__dirname, 'showcase.html'),
        docs: resolve(__dirname, 'docs.html'),
      },
    },
  },
}));
