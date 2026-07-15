import { DevTools } from '@vitejs/devtools'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// This config is intentionally written the way a real user would write it:
// it imports `DevTools` from the published `@vitejs/devtools` package (resolved
// here from the local built dist), with no monorepo aliases or `src` imports.
export default defineConfig({
  plugins: [
    Vue(),
    DevTools(),
  ],
  build: {
    rolldownOptions: {
      // Enable Rolldown's devtools build instrumentation so the Rolldown
      // panels have real build data to show.
      devtools: {},
    },
  },
})
