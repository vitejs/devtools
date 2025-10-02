import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import Inspect from 'vite-plugin-inspect'
import '@nuxt/eslint'

const NUXT_DEBUG_BUILD = !!process.env.NUXT_DEBUG_BUILD

const BASE = '/.devtools-vite/'

// const headers: Record<string, string> = isWebContainer
//   ? {
//       'Cross-Origin-Embedder-Policy': 'require-corp',
//       'Cross-Origin-Opener-Policy': 'same-origin',
//     }
//   : {}

const pkgPath = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url))

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
    '@vitejs/devtools-rpc': pkgPath('rpc/src'),
    '@vitejs/devtools-kit/client': pkgPath('kit/src/client/index.ts'),
    '@vitejs/devtools-kit': pkgPath('kit/src/index.ts'),
    '@vitejs/devtools-vite': pkgPath('vite/src/index.ts'),
    '@vitejs/devtools/client/inject': pkgPath('core/src/client/inject/index.ts'),
    '@vitejs/devtools/client/webcomponents': pkgPath('core/src/client/webcomponents/index.ts'),
    '@vitejs/devtools': pkgPath('core/src/index.ts'),
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
    // Temporary disable type check for nuxt, rely on CI for now
    // typeCheck: true,
    includeWorkspace: true,
  },

  workspaceDir: '../../',

  compatibilityDate: '2024-07-17',
})
