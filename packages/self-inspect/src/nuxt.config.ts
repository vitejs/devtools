import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import { alias } from '../../../alias'
import '@nuxt/eslint'

const BASE = '/.devtools-self-inspect/'

export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@nuxt/eslint',
    'nuxt-eslint-auto-explicit-import',
    './modules/rpc',
  ],

  alias,

  logLevel: 'verbose',
  srcDir: 'app',

  eslint: {
    config: {
      standalone: false,
    },
  },

  experimental: {
    typedPages: true,
    clientNodeCompat: true,
  },

  features: {
    inlineStyles: false,
  },

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
    sourceMap: false,
  },

  unocss: {
    configFile: fileURLToPath(new URL('./uno.config.ts', import.meta.url)),
  },

  app: {
    baseURL: BASE,
    head: {
      title: 'DevTools Self Inspect',
      charset: 'utf-8',
      viewport: 'width=device-width,initial-scale=1',
      meta: [
        { name: 'description', content: 'DevTools for inspecting the DevTools itself' },
      ],
      htmlAttrs: {
        lang: 'en',
      },
    },
  },

  debug: false,

  vite: {
    base: BASE,
    build: {
      cssMinify: false,
    },
    optimizeDeps: {
      exclude: [
        'structured-clone-es',
        'birpc',
      ],
    },
    // @ts-expect-error devtools is a custom vite option
    devtools: {
      clientAuth: false,
    },
  },

  devtools: {
    enabled: false,
  },

  typescript: {
    includeWorkspace: true,
  },

  workspaceDir: '../../',

  compatibilityDate: '2024-07-17',
})
