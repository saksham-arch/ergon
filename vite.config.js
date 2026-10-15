import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use an assigned port when one is given (e.g. a preview server), else 5173.
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
})
