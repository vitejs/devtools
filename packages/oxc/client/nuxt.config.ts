import { defineNuxtConfig } from 'nuxt/config'

const BASE = '/__devtools-oxc/'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  ssr: false,
  nitro: {
    preset: 'static',
    output: {
      dir: '../dist/client',
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
        // headers,
      },
    },
  },
  modules: ['@nuxt/ui', '@vueuse/nuxt'],
  css: ['~/assets/css/main.css'],
  icon: {
    clientBundle: {
      scan: {
        globInclude: ['app/**/*'],
      },
    },
    customCollections: [
      {
        prefix: 'custom',
        dir: './app/assets/icons',
      },
    ],
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
  ui: {
    fonts: false,
  },
  vite: {
    base: BASE,
    optimizeDeps: {
      include: ['modern-monaco'],
    },
  },
})
