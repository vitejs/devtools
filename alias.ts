import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'pathe'

const root = fileURLToPath(new URL('.', import.meta.url))
const r = (path: string) => fileURLToPath(new URL(`./packages/${path}`, import.meta.url))

export const alias = {
  '@vitejs/devtools-rpc/presets/ws/server': r('rpc/src/presets/ws/server.ts'),
  '@vitejs/devtools-rpc/presets/ws/client': r('rpc/src/presets/ws/client.ts'),
  '@vitejs/devtools-rpc': r('rpc/src'),
  '@vitejs/devtools-kit/client': r('kit/src/client/index.ts'),
  '@vitejs/devtools-kit/utils/events': r('kit/src/utils/events.ts'),
  '@vitejs/devtools-kit/utils/nanoid': r('kit/src/utils/nanoid.ts'),
  '@vitejs/devtools-kit/utils/shared-state': r('kit/src/utils/shared-state.ts'),
  '@vitejs/devtools-kit': r('kit/src/index.ts'),
  '@vitejs/devtools-vite': r('vite/src/index.ts'),
  '@vitejs/devtools/client/inject': r('core/src/client/inject/index.ts'),
  '@vitejs/devtools/client/webcomponents': r('core/src/client/webcomponents/index.ts'),
  '@vitejs/devtools': r('core/src/index.ts'),
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
