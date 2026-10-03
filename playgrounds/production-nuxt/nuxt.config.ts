import { defineNuxtConfig } from 'nuxt/config'

// This config is intentionally written the way a real user would write it:
// enabling Nuxt DevTools is the only integration point needed. Nuxt DevTools
// v4 (`@nuxt/devtools`, overridden here to resolve its internal Vite DevTools
// dependency from the local built dist — see `pnpm-workspace.yaml`) embeds
// Vite DevTools as its own engine, so there's no separate `@vitejs/devtools`
// Vite plugin to add by hand.
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
})
