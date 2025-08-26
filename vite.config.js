import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'digital-goods-app.vercel.app',
      't.me',
      'telegram.org'
    ]
  }
})