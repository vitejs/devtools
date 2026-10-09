import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import { alias } from '../../../alias'
import '@nuxt/eslint'

const NUXT_DEBUG_BUILD = !!process.env.NUXT_DEBUG_BUILD
const BASE = '/__devtools-vite-task/'
const VITE_BASE = process.env.NODE_ENV === 'development' ? `${BASE}_nuxt/` : BASE

export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@nuxt/eslint',
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
    viteEnvironmentApi: true,
  },

  features: {
    inlineStyles: false,
  },

  nitro: {
    minify: NUXT_DEBUG_BUILD ? false : undefined,
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
      title: 'Vite Task DevTools',
      charset: 'utf-8',
      viewport: 'width=device-width,initial-scale=1',
      meta: [
        { name: 'description', content: 'DevTools for Vite Task' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      htmlAttrs: {
        lang: 'en',
      },
    },
  },

  debug: false,

  vite: {
    base: VITE_BASE,
    build: {
      minify: NUXT_DEBUG_BUILD ? false : undefined,
      cssMinify: false,
    },
    optimizeDeps: {
      include: [
        '@vueuse/core',
      ],
      exclude: [
        'structured-clone-es',
        'birpc',
      ],
    },
    devtools: {
      enabled: false,
      clientAuth: false,
    },
  },

  devtools: {
    enabled: false,
  },

  typescript: {
    tsConfig: {
      exclude: [
        '../../../rolldown/**/*',
        '../../../vite/**/*',
        '../../../oxc/**/*',
      ],
    },
  },

  workspaceDir: '../../',

  compatibilityDate: '2024-07-17',
})
