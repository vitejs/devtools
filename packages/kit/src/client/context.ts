import type { DevToolsClientContext } from './docks'

// The kit owns this global key — the webcomponents host writes to it and
// dock client scripts read from it. Independent of devframe-hub's own
// `CLIENT_CONTEXT_KEY` (which points at a different global).
const CLIENT_CONTEXT_KEY = '__VITE_DEVTOOLS_CLIENT_CONTEXT__'

/**
 * Get the global DevTools client context, or `undefined` if not yet initialized.
 */
export function getDevToolsClientContext(): DevToolsClientContext | undefined {
  return (globalThis as any)[CLIENT_CONTEXT_KEY]
}

export { CLIENT_CONTEXT_KEY }
