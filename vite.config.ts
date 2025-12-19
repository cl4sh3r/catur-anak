import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // 🔴 WAJIB untuk GitHub Pages
  base: mode === 'production' ? '/catur-anak/' : '/',

  plugins: [react()],
}))
