import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // These forward BOTH exact paths and any subpaths, e.g. /session/abc/history
      '/session': { target: 'http://localhost:4000', changeOrigin: true },
      '/chat':    { target: 'http://localhost:4000', changeOrigin: true },
      '/history': { target: 'http://localhost:4000', changeOrigin: true },
      '/clear':   { target: 'http://localhost:4000', changeOrigin: true },
      '/health':  { target: 'http://localhost:4000', changeOrigin: true },
    }
  }
})
