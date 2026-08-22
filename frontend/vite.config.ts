import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': { target: 'http://localhost:8765', changeOrigin: true },
      '/voices': { target: 'http://localhost:8765', changeOrigin: true },
      '/jobs': { target: 'http://localhost:8765', changeOrigin: true },
      '/health': { target: 'http://localhost:8765', changeOrigin: true },
      '/system': { target: 'http://localhost:8765', changeOrigin: true },
    },
  },
})
