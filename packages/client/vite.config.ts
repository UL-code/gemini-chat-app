import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{
    proxy:{
      // Redirect API calls to the backend server
      '/api': 'http://localhost:3000'
    }
  }
})
