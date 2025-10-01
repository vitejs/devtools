import type { Plugin } from 'vite'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

export function DevTools(): Plugin[] {
  return [
    DevToolsInjection(),
    DevToolsServer(),
  ]
}

export {
  DevToolsInjection,
  DevToolsServer,
}
