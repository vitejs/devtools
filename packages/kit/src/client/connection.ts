import type { DevframeRpcClient, DevframeRpcClientOptions } from '@devframes/hub/client'
import { getDevframeRpcClient } from '@devframes/hub/client'

/**
 * The Vite DevTools flavour of devframe's {@link getDevframeRpcClient}. Kept as
 * a dedicated export for naming symmetry with the kit's other `DevTools*`
 * primitives.
 *
 * Vite DevTools mounts each devframe (Terminals, the Inspector, …) as a
 * same-origin iframe at its own base (e.g. `/__devframes-plugin-terminals/`).
 * Cross-base connection-meta inheritance — a child iframe reusing the parent's
 * `__connection.json` without dialing its own base's (wrong) endpoint — is
 * handled natively by devframe's client via `ConnectionMeta.baseUrl` since
 * devframe 0.7.2 (devframes/devframe#98), so no extra rewriting is needed here.
 */
export function getDevToolsRpcClient(
  options: DevframeRpcClientOptions = {},
): Promise<DevframeRpcClient> {
  return getDevframeRpcClient(options)
}
