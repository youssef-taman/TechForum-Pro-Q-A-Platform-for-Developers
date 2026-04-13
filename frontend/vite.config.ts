import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://app:8080',
        changeOrigin: true,
        secure: false,
        // deletes '/api' from the URL before sending it to Java
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})