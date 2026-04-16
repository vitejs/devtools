import type { Plugin } from 'vite'
import process from 'node:process'
import { join, normalize } from 'pathe'
import { dirDist } from '../../dirs'

export function DevToolsInjection(): Plugin {
  return {
    name: 'vite:devtools:injection',
    enforce: 'post',
    apply(_config, env) {
      return env.command === 'serve' && !env.isSsrBuild
    },
    transformIndexHtml() {
      const fileUrl = process.env.VITE_DEVTOOLS_LOCAL_DEV
        ? normalize(join(dirDist, '..', 'src/client/inject/index.ts'))
        : normalize(join(dirDist, 'client/inject.js'))
      return [
        {
          tag: 'script',
          attrs: {
            src: `/@fs/${fileUrl}`,
            type: 'module',
          },
          injectTo: 'body',
        },
      ]
    },
  }
}
