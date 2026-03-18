import type { DevToolsClientContext } from './docks'

const CLIENT_CONTEXT_KEY = '__VITE_DEVTOOLS_CLIENT_CONTEXT__'

/**
 * Get the global DevTools client context, or `undefined` if not yet initialized.
 */
export function getDevToolsClientContext(): DevToolsClientContext | undefined {
  return (globalThis as any)[CLIENT_CONTEXT_KEY]
}

export { CLIENT_CONTEXT_KEY }
