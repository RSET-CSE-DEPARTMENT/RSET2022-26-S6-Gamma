import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Specify which polyfills you need
      include: ['process', 'stream', 'buffer'],
      globals: {
        Buffer: true,
        process: true,
      }
    })
  ],
  define: {
    'process.env': {},
    'global': {}
  },
  resolve: {
    alias: {
      process: "process/browser",
      stream: "stream-browserify",
      buffer: "buffer",
    }
  }
})