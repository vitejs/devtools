import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import { alias } from '../../../alias'

const BASE = '/__devtools-oxc/'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  ssr: false,
  srcDir: 'app',
  nitro: {
    preset: 'static',
    output: {
      dir: '../dist',
    },
    routeRules: {
      '/': {
        prerender: true,
      },
      '/200.html': {
        prerender: true,
      },
      '/404.html': {
        prerender: true,
      },
      '/**': {
        prerender: false,
      },
    },
  },
  modules: ['@unocss/nuxt', '@vueuse/nuxt'],

  alias,

  unocss: {
    configFile: fileURLToPath(new URL('./uno.config.ts', import.meta.url)),
  },

  devServer: {
    port: 4448,
  },
  app: {
    baseURL: BASE,
    head: {
      title: 'Oxc Inspector',
      meta: [
        {
          name: 'description',
          content: 'Inspect and understand the Oxc toolchain with ease.',
        },
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg',
        },
      ],
      htmlAttrs: {
        lang: 'en',
        class: 'bg-dots',
      },
    },
  },
  vite: {
    base: BASE,
    optimizeDeps: {
      include: ['modern-monaco', 'floating-vue'],
    },
  },
})
