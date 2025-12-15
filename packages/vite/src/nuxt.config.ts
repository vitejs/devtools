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
    '@vitejs/devtools-rpc/presets/ws/server': pkgPath('rpc/src/presets/ws/server.ts'),
    '@vitejs/devtools-rpc/presets/ws/client': pkgPath('rpc/src/presets/ws/client.ts'),
    '@vitejs/devtools-kit/client': pkgPath('kit/src/client/index.ts'),
    '@vitejs/devtools-kit/utils/events': pkgPath('kit/src/utils/events.ts'),
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
        '@antfu/utils',
        '@vueuse/core',
        '@floating-ui/dom',
        'd3-hierarchy',
        'd3-shape',
        'fuse.js',
        'codemirror',
        'codemirror/addon/dialog/dialog',
        'codemirror/addon/display/placeholder',
        'codemirror/addon/search/jump-to-line',
        'codemirror/addon/search/search',
        'codemirror/mode/css/css',
        'codemirror/mode/handlebars/handlebars',
        'codemirror/mode/htmlmixed/htmlmixed',
        'codemirror/mode/javascript/javascript',
        'codemirror/mode/markdown/markdown',
        'codemirror/mode/pug/pug',
        'codemirror/mode/sass/sass',
        'codemirror/mode/vue/vue',
        'codemirror/mode/xml/xml',
        'comlink',
        'floating-vue',
        'splitpanes',
        'vue-virtual-scroller',
        'nanovis',
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
    enabled: false,
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
