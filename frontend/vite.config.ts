// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'lucide-react',
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'i18next',
      'react-i18next',
      'react-hot-toast',
      'date-fns',
      'zustand',
      'jspdf',
      'html2canvas',
    ],
  },
  server: {
    host: true,
    port: 5173,
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/context/AuthContext.tsx',
        './src/pages/HomePage.tsx',
      ],
    },
  },
});
