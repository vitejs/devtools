import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'pathe'

const root = fileURLToPath(new URL('.', import.meta.url))
const r = (path: string) => fileURLToPath(new URL(`./packages/${path}`, import.meta.url))

export const alias = {
  'takubox/rpc/presets/ws/server': r('takubox/src/rpc/presets/ws/server.ts'),
  'takubox/rpc/presets/ws/client': r('takubox/src/rpc/presets/ws/client.ts'),
  'takubox/rpc/presets': r('takubox/src/rpc/presets/index.ts'),
  'takubox/rpc/client': r('takubox/src/rpc/client.ts'),
  'takubox/rpc/server': r('takubox/src/rpc/server.ts'),
  'takubox/rpc': r('takubox/src/rpc'),
  'takubox': r('takubox/src'),
  // Tombstone — still resolves to the same files in case external code imports the old name.
  '@vitejs/devtools-rpc/presets/ws/server': r('takubox/src/rpc/presets/ws/server.ts'),
  '@vitejs/devtools-rpc/presets/ws/client': r('takubox/src/rpc/presets/ws/client.ts'),
  '@vitejs/devtools-rpc/presets': r('takubox/src/rpc/presets/index.ts'),
  '@vitejs/devtools-rpc/client': r('takubox/src/rpc/client.ts'),
  '@vitejs/devtools-rpc/server': r('takubox/src/rpc/server.ts'),
  '@vitejs/devtools-rpc': r('takubox/src/rpc'),
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
