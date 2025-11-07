// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // load .env files (mode-aware)
  const env = loadEnv(mode, process.cwd(), '')

  // VITE_API_URL is expected to include the /api suffix, e.g. http://localhost:8000/api
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000/api'

  // remove trailing slash if present and extract origin (proxy target should be origin)
  const apiTarget = apiUrl.replace(/\/+$/, '')

  return {
    plugins: [react()],
    server: {
      // dev proxy: forward any /api requests to the backend to avoid CORS in dev
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          // keep path as /api/..., backend expects /api/...
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
      },
    },
    define: {
      // optional: ensure import.meta.env.VITE_API_URL is defined at runtime
      'process.env': {},
    },
  }
})
