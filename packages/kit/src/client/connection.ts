import type { DevframeRpcClient, DevframeRpcClientOptions } from '@devframes/hub/client'
import type { DevframeRpcClientFunctions } from '@devframes/hub/types'
import type { BirpcReturn } from 'devframe/rpc'
import type { DevToolsRpcServerFunctions } from '../types/rpc-augments'
import { getDevframeRpcClient } from '@devframes/hub/client'

export type DevToolsRpcClientCall = BirpcReturn<DevToolsRpcServerFunctions, DevframeRpcClientFunctions>['$call']
export type DevToolsRpcClientCallEvent = BirpcReturn<DevToolsRpcServerFunctions, DevframeRpcClientFunctions>['$callEvent']
export type DevToolsRpcClientCallOptional = BirpcReturn<DevToolsRpcServerFunctions, DevframeRpcClientFunctions>['$callOptional']
export type DevToolsRpcClientOptions = DevframeRpcClientOptions

export interface DevToolsRpcClient extends Omit<
  DevframeRpcClient,
  'call' | 'callEvent' | 'callOptional'
> {
  call: DevToolsRpcClientCall
  callEvent: DevToolsRpcClientCallEvent
  callOptional: DevToolsRpcClientCallOptional
}

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
 *
 * Vite DevTools provides its own interactive authorization view, so disable
 * devframe's native browser-prompt fallback for every kit-managed connection.
 */
export function getDevToolsRpcClient(
  options: DevToolsRpcClientOptions = {},
): Promise<DevToolsRpcClient> {
  return getDevframeRpcClient({
    ...options,
    simpleAuth: false,
  }) as Promise<DevToolsRpcClient>
}
