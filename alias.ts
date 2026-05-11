import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'pathe'

const root = fileURLToPath(new URL('.', import.meta.url))
const r = (path: string) => fileURLToPath(new URL(`./packages/${path}`, import.meta.url))
const df = (path: string) => fileURLToPath(new URL(`./devframe/packages/${path}`, import.meta.url))

export const alias = {
  'devframe/rpc/transports/ws-server': df('devframe/src/rpc/transports/ws-server.ts'),
  'devframe/rpc/transports/ws-client': df('devframe/src/rpc/transports/ws-client.ts'),
  'devframe/rpc/client': df('devframe/src/rpc/client.ts'),
  'devframe/rpc/server': df('devframe/src/rpc/server.ts'),
  'devframe/rpc': df('devframe/src/rpc'),
  'devframe/types': df('devframe/src/types/index.ts'),
  'devframe/node': df('devframe/src/node/index.ts'),
  'devframe/constants': df('devframe/src/constants.ts'),
  'devframe/internal': df('devframe/src/internal/index.ts'),
  'devframe/utils/colors': df('devframe/src/utils/colors.ts'),
  'devframe/utils/events': df('devframe/src/utils/events.ts'),
  'devframe/utils/hash': df('devframe/src/utils/hash.ts'),
  'devframe/utils/human-id': df('devframe/src/utils/human-id.ts'),
  'devframe/utils/launch-editor': df('devframe/src/utils/launch-editor.ts'),
  'devframe/utils/nanoid': df('devframe/src/utils/nanoid.ts'),
  'devframe/utils/open': df('devframe/src/utils/open.ts'),
  'devframe/utils/promise': df('devframe/src/utils/promise.ts'),
  'devframe/utils/serve-static': df('devframe/src/utils/serve-static.ts'),
  'devframe/utils/shared-state': df('devframe/src/utils/shared-state.ts'),
  'devframe/utils/streaming-channel': df('devframe/src/utils/streaming-channel.ts'),
  'devframe/utils/structured-clone': df('devframe/src/utils/structured-clone.ts'),
  'devframe/utils/when': df('devframe/src/utils/when.ts'),
  'devframe/adapters/cli': df('devframe/src/adapters/cli.ts'),
  'devframe/adapters/dev': df('devframe/src/adapters/dev.ts'),
  'devframe/adapters/build': df('devframe/src/adapters/build.ts'),
  'devframe/adapters/vite': df('devframe/src/adapters/vite.ts'),
  'devframe/adapters/embedded': df('devframe/src/adapters/embedded.ts'),
  'devframe/adapters/mcp': df('devframe/src/adapters/mcp.ts'),
  '@devframes/nuxt/runtime/plugin.client': df('nuxt/src/runtime/plugin.client.ts'),
  '@devframes/nuxt': df('nuxt/src/index.ts'),
  'devframe/recipes/open-helpers': df('devframe/src/recipes/open-helpers.ts'),
  'devframe/client': df('devframe/src/client/index.ts'),
  'devframe': df('devframe/src'),
  '@vitejs/devtools-kit/node': r('kit/src/node/index.ts'),
  '@vitejs/devtools-kit/client': r('kit/src/client/index.ts'),
  '@vitejs/devtools-kit/constants': r('kit/src/constants.ts'),
  '@vitejs/devtools-kit/utils/events': r('kit/src/utils/events.ts'),
  '@vitejs/devtools-kit/utils/nanoid': r('kit/src/utils/nanoid.ts'),
  '@vitejs/devtools-kit/utils/human-id': r('kit/src/utils/human-id.ts'),
  '@vitejs/devtools-kit/utils/when': r('kit/src/utils/when.ts'),
  '@vitejs/devtools-kit/utils/shared-state': r('kit/src/utils/shared-state.ts'),
  '@vitejs/devtools-kit': r('kit/src/index.ts'),
  '@vitejs/devtools-rolldown': r('rolldown/src/index.ts'),
  '@vitejs/devtools-self-inspect': r('self-inspect/src/index.ts'),
  '@vitejs/devtools/internal': r('core/src/internal.ts'),
  '@vitejs/devtools/client/inject': r('core/src/client/inject/index.ts'),
  '@vitejs/devtools/client/webcomponents': r('core/src/client/webcomponents/index.ts'),
  '@vitejs/devtools': r('core/src/index.ts'),
  '@vitejs/devtools-ui/unocss': r('ui/src/unocss/index.ts'),
  '@vitejs/devtools-ui/components': r('ui/src/components'),
  '@vitejs/devtools-ui/composables': r('ui/src/composables'),
  '@vitejs/devtools-ui/utils': r('ui/src/utils'),
}

// update tsconfig.base.json
const raw = fs.readFileSync(join(root, 'tsconfig.base.json'), 'utf-8').trim()
const tsconfig = JSON.parse(raw)
tsconfig.compilerOptions.paths = Object.fromEntries(
  Object.entries(alias).map(([key, value]) => [key, [`./${relative(root, value)}`]]),
)
const newRaw = JSON.stringify(tsconfig, null, 2)
if (newRaw !== raw)
  fs.writeFileSync(join(root, 'tsconfig.base.json'), `${newRaw}\n`, 'utf-8')
