import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = 'http://localhost:8765'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': { target: backend, changeOrigin: true },
      '/voices': { target: backend, changeOrigin: true },
      '/jobs': { target: backend, changeOrigin: true },
      '/health': { target: backend, changeOrigin: true },
      '/system': { target: backend, changeOrigin: true },
    },
  },
})
