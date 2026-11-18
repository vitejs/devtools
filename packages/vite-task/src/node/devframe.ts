import { existsSync } from 'node:fs'
import { defineDevframe } from 'devframe'
import { description, homepage, name, version } from '../../package.json'
import { clientPublicDir } from '../dirs'
import { rpcFunctions } from './rpc'

export const VITE_TASK_DEVTOOLS_BASE = '/__devtools-vite-task/'

export const viteTaskDevframe = defineDevframe({
  id: 'vite-task',
  name: 'Vite Task',
  version,
  packageName: name,
  importMetaUrl: import.meta.url,
  homepage,
  description,
  icon: `${VITE_TASK_DEVTOOLS_BASE}favicon.svg`,
  basePath: VITE_TASK_DEVTOOLS_BASE,
  clientAssets: existsSync(clientPublicDir) ? clientPublicDir : undefined,
  setup(ctx) {
    for (const fn of rpcFunctions)
      ctx.rpc.register(fn as any)
  },
})
