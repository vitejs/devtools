import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'

const define = {
  'import.meta.env.VITE_DEVTOOLS_LOCAL_DEV': 'false',
  'process.env.VITE_DEVTOOLS_LOCAL_DEV': 'false',
}

const deps = {
  neverBundle: [
    'vite',
    '@vitejs/devtools/client/webcomponents',
    /^node:/,
  ],
  // @keep-sorted
  onlyBundle: [
    '@clack/core',
    '@clack/prompts',
    '@json-render/core',
    '@json-render/vue',
    '@vue/reactivity',
    '@vue/runtime-core',
    '@vue/runtime-dom',
    '@vue/shared',
    '@vueuse/core',
    '@vueuse/shared',
    '@xterm/addon-fit',
    '@xterm/xterm',
    'csstype',
    'dompurify',
    'fast-string-truncated-width',
    'fast-string-width',
    'fast-wrap-ansi',
    'fuse.js',
    'get-port-please',
    'human-id',
    'sisteransi',
    'vue',
    'zod',
  ],
}

const inputOptions = {
  resolve: {
    mainFields: ['module', 'main'],
  },
  experimental: {
    resolveNewUrlToAsset: false,
  },
}

const tsconfig = '../../tsconfig.base.json'

// Split into two configs so the client and server entries live in independent
// rolldown chunk graphs. A single combined build lets rolldown hoist shared
// helpers (e.g. `__exportAll`) into chunks that mix server-only imports like
// `devframe/rpc/transports/ws-server`, which then leak into the browser bundle.
export default defineConfig([
  // Client build — runs first; `clean: true` clears dist/ before the server
  // build appends to it. Keep this first in the array.
  {
    clean: true,
    platform: 'browser',
    tsconfig,
    plugins: [
      Vue({
        isProduction: true,
      }),
    ],
    deps,
    entry: {
      'client/inject': 'src/client/inject/index.ts',
      'client/webcomponents': 'src/client/webcomponents/index.ts',
    },
    dts: true,
    inputOptions,
    define,
    hooks: {
      'build:before': async function () {
        const { buildCSS } = await import('./src/client/webcomponents/scripts/build-css')
        await buildCSS()
      },
    },
  },
  // Server build — `clean: false` so it appends to the client output. No Vue
  // plugin (server entries don't import .vue) and no CSS hook.
  {
    clean: false,
    platform: 'neutral',
    tsconfig,
    deps,
    entry: {
      'index': 'src/index.ts',
      'integration': 'src/integration.ts',
      'internal': 'src/internal.ts',
      'dirs': 'src/dirs.ts',
      'cli': 'src/node/cli.ts',
      'cli-commands': 'src/node/cli-commands.ts',
      'config': 'src/node/config.ts',
    },
    dts: true,
    inputOptions,
    define,
  },
])
