import { fileURLToPath } from 'node:url'
import { defineRpcFunction } from 'devframe'
import { defineDevframe } from 'devframe/types'
import { glob } from 'tinyglobby'

const BASE_PATH = '/__devframe-files-inspector/'
const distDir = fileURLToPath(new URL('../dist/client', import.meta.url))

export default defineDevframe({
  id: 'devframe-files-inspector',
  name: 'Files Inspector',
  icon: 'ph:folder-open-duotone',
  basePath: BASE_PATH,
  cli: {
    command: 'devframe-files-inspector',
    port: 9876,
    distDir,
  },
  spa: { loader: 'none' },
  async setup(ctx) {
    ctx.rpc.register(defineRpcFunction({
      name: 'devframe-files-inspector:get-cwd',
      type: 'static',
      jsonSerializable: true,
      handler: () => ({ cwd: ctx.cwd }),
    }))

    ctx.rpc.register(defineRpcFunction({
      name: 'devframe-files-inspector:list-files',
      type: 'query',
      jsonSerializable: true,
      handler: async () => {
        const files = await glob(['*'], { cwd: ctx.cwd, onlyFiles: true, dot: false })
        return files.map(f => f.replace(/\\/g, '/')).sort()
      },
      snapshot: true,
    }))
  },
})
