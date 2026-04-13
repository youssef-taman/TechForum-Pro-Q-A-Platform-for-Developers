import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,  // required for Docker to expose the dev server
    proxy: {
      '/api': {
        target: 'http://app:8080',
        changeOrigin: true,
        secure: false,
        // Strips '/api' prefix before forwarding to Spring Boot.
        // Your Spring controllers must NOT use /api prefix themselves.
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})