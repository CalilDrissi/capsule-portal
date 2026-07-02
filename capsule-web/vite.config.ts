import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own chunks so no single bundle is huge.
        manualChunks: {
          carbon: ['@carbon/react', '@carbon/icons-react'],
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      // Fallback proxy so the SPA can also reach the API via same-origin /api
      '/api': {
        target: 'http://localhost:8800',
        changeOrigin: true,
      },
    },
  },
})
