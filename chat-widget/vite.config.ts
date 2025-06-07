import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    cssCodeSplit: false,
    assetsInlineLimit: 10000, // Inline small assets
  },
  css: {
    postcss: './postcss.config.js',
  },
}) 