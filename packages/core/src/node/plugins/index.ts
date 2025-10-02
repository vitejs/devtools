import type { Plugin } from 'vite'
// eslint-disable-next-line ts/ban-ts-comment
// @ts-ignore ignore the type error
import { DevToolsViteUI } from '@vitejs/devtools-vite'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

export interface DevToolsOptions {
  /**
   * Include the Vite builtin devtools UI.
   *
   * @default true
   */
  builtinDevTools?: boolean
}

export function DevTools(options: DevToolsOptions = {}): Plugin[] {
  const {
    builtinDevTools = true,
  } = options

  const plugins = [
    DevToolsInjection(),
    DevToolsServer(),
  ]

  if (builtinDevTools) {
    plugins.push(DevToolsViteUI())
  }

  return plugins
}

export {
  DevToolsInjection,
  DevToolsServer,
  DevToolsViteUI,
}
