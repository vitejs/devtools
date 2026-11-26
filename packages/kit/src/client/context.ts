import type { DevToolsClientContext } from './docks'
import { getDevframeClientContext } from '@devframes/hub/client'

/**
 * Get the global DevTools client context, or `undefined` if not yet initialized.
 *
 * The context lives in `@devframes/hub`'s global slot (`CLIENT_CONTEXT_KEY`),
 * where the embedded and standalone DevTools clients publish it.
 */
export function getDevToolsClientContext(): DevToolsClientContext | undefined {
  return getDevframeClientContext()
}

export { CLIENT_CONTEXT_KEY } from '@devframes/hub/client'
