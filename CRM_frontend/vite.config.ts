import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-redux',
      '@reduxjs/toolkit',
      '@mui/material',
      '@mui/icons-material',
      'axios',
      'react-toastify',
    ],
  },
  build: {
    // Better code splitting for faster reloads
    rollupOptions: {
      output: {
        manualChunks: {
          // Split out heavy vendor libraries
          'mui-core': ['@mui/material', '@mui/icons-material'],
          'redux-lib': ['react-redux', '@reduxjs/toolkit'],
          'router': ['react-router-dom'],
          'api': ['axios'],
        },
      },
    },
    // Increase chunk size warning threshold for dev
    chunkSizeWarningLimit: 2000,
  },
})
