import type { Plugin } from 'vite'
import { join } from 'node:path'
import process from 'node:process'
import { normalizePath } from 'vite'
import { dirDist } from '../../dirs'

export function DevToolsInjection(): Plugin {
  return {
    name: 'vite:devtools:injection',
    enforce: 'post',
    transformIndexHtml() {
      const fileUrl = process.env.VITE_DEVTOOLS_LOCAL_DEV
        ? normalizePath(join(dirDist, '..', 'src/client/inject/index.ts'))
        : normalizePath(join(dirDist, 'client/inject.js'))
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
