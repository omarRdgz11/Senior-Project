/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // loadEnv merges .env* files AND process.env
  const env = loadEnv(mode, process.cwd(), '')
  const isDocker = !!env.DOCKER

  const proxyTarget = isDocker ? 'http://backend:5005' : 'http://localhost:5005'

  return {
    plugins: [tailwindcss(), react()], // React AFTER Tailwind
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
