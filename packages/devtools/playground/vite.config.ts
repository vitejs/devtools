import { DevTools } from '@vitejs/devtools'
import { DevToolsVite } from '@vitejs/devtools-vite'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    Vue(),
    // For local playground only. As a user you don't install this plugin directly.
    DevTools(),
    DevToolsVite(),
  ],
})
