import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import Inspect from 'vite-plugin-inspect'
import '@nuxt/eslint'

const NUXT_DEBUG_BUILD = !!process.env.NUXT_DEBUG_BUILD

const BASE = '/__vite_devtools_vite__/'

// const headers: Record<string, string> = isWebContainer
//   ? {
//       'Cross-Origin-Embedder-Policy': 'require-corp',
//       'Cross-Origin-Opener-Policy': 'same-origin',
//     }
//   : {}

export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@nuxt/eslint',
    'nuxt-eslint-auto-explicit-import',
    './modules/rpc',
  ],

  alias: {
    '@vitejs/devtools-rpc': fileURLToPath(new URL('../../devtools-rpc/src', import.meta.url)),
    '@vitejs/devtools-kit/client': fileURLToPath(new URL('../../devtools-kit/src/client/index.ts', import.meta.url)),
    '@vitejs/devtools-kit': fileURLToPath(new URL('../../devtools-kit/src/index.ts', import.meta.url)),
    '@vitejs/devtools-vite': fileURLToPath(new URL('../../devtools-vite/src/index.ts', import.meta.url)),
    '@vitejs/devtools/client/inject': fileURLToPath(new URL('../../devtools/src/client/inject/index.ts', import.meta.url)),
    '@vitejs/devtools/client/webcomponents': fileURLToPath(new URL('../../devtools/src/client/webcomponents/index.ts', import.meta.url)),
    '@vitejs/devtools': fileURLToPath(new URL('../../devtools/src/index.ts', import.meta.url)),
  },

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
        // headers,
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

  vite: {
    base: BASE,
    // server: {
    //   headers,
    // },
    build: {
      rolldownOptions: {
        debug: {},
      },
      minify: NUXT_DEBUG_BUILD ? false : undefined,
      cssMinify: false,
    },
    optimizeDeps: {
      include: [
        'fuse.js',
        'd3-hierarchy',
        'd3-shape',
      ],
      exclude: [
        'structured-clone-es',
        'birpc',
      ],
    },
    plugins: [
      NUXT_DEBUG_BUILD ? Inspect({ build: true }) : null,
    ],
  },

  devtools: {
    enabled: true,
  },

  typescript: {
    tsConfig: {
      compilerOptions: {
        types: ['chrome'], // for devtools-webext package
      },
    },
    typeCheck: true,
    includeWorkspace: true,
  },

  workspaceDir: '../../',

  compatibilityDate: '2024-07-17',
})
