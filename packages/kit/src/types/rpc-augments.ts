import type { DevframeRpcServerFunctions } from '@devframes/hub/types'

/**
 * Server-side RPC functions exposed by Vite DevTools integrations.
 *
 * Extend this interface with module augmentation to type `rpc.call()`.
 */
export interface DevToolsRpcServerFunctions extends DevframeRpcServerFunctions {}
