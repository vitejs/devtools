import process from 'node:process'
import { defineNuxtConfig } from 'nuxt/config'
import { alias } from '../../../alias'
import '@nuxt/eslint'

const NUXT_DEBUG_BUILD = !!process.env.NUXT_DEBUG_BUILD
const BASE = '/.devtools-vite/'

export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@nuxt/eslint',
    'nuxt-eslint-auto-explicit-import',
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

  app: {
    baseURL: BASE,
    head: {
      title: 'Vite DevTools',
      charset: 'utf-8',
      viewport: 'width=device-width,initial-scale=1',
      meta: [
        { name: 'description', content: 'DevTools for Vite' },
        { property: 'og:title', content: 'Vite DevTools' },
        { property: 'og:description', content: 'DevTools for Vite' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: `/favicon.svg` },
      ],
      htmlAttrs: {
        lang: 'en',
        class: 'bg-dots',
      },
    },
  },

  debug: false,

  vite: {
    base: BASE,
    build: {
      minify: NUXT_DEBUG_BUILD ? false : undefined,
      cssMinify: false,
    },
    optimizeDeps: {
      exclude: [
        'structured-clone-es',
        'birpc',
      ],
    },
    // @ts-expect-error skip type check
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
