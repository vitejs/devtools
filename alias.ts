import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'pathe'

const root = fileURLToPath(new URL('.', import.meta.url))
const r = (path: string) => fileURLToPath(new URL(`./packages/${path}`, import.meta.url))

export const alias = {
  'devframe/rpc/transports/ws-server': r('devframe/src/rpc/transports/ws-server.ts'),
  'devframe/rpc/transports/ws-client': r('devframe/src/rpc/transports/ws-client.ts'),
  'devframe/rpc/client': r('devframe/src/rpc/client.ts'),
  'devframe/rpc/server': r('devframe/src/rpc/server.ts'),
  'devframe/rpc': r('devframe/src/rpc'),
  'devframe/types': r('devframe/src/types/index.ts'),
  'devframe/node': r('devframe/src/node/index.ts'),
  'devframe/constants': r('devframe/src/constants.ts'),
  'devframe/utils/events': r('devframe/src/utils/events.ts'),
  'devframe/utils/human-id': r('devframe/src/utils/human-id.ts'),
  'devframe/utils/nanoid': r('devframe/src/utils/nanoid.ts'),
  'devframe/utils/promise': r('devframe/src/utils/promise.ts'),
  'devframe/utils/shared-state': r('devframe/src/utils/shared-state.ts'),
  'devframe/utils/state': r('devframe/src/utils/state.ts'),
  'devframe/utils/when': r('devframe/src/utils/when.ts'),
  'devframe/cli': r('devframe/src/cli.ts'),
  'devframe/build': r('devframe/src/build.ts'),
  'devframe/spa': r('devframe/src/spa.ts'),
  'devframe/vite': r('devframe/src/vite.ts'),
  'devframe/kit': r('devframe/src/kit.ts'),
  'devframe/embedded': r('devframe/src/embedded.ts'),
  'devframe/client': r('devframe/src/client.ts'),
  'devframe': r('devframe/src'),
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
