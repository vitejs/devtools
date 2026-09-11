import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Vite loads DevTools from the local built package, as it would in a user project.
export default defineConfig({
  plugins: [Vue()],
  devtools: true,
})
