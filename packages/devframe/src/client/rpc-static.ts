import type { DevToolsRpcClientMode } from './rpc'
import { DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME } from 'devframe/constants'
import { createStaticRpcCaller } from './static-rpc'

export interface CreateStaticRpcClientModeOptions {
  fetchJsonFromBases: (path: string) => Promise<any>
}

export async function createStaticRpcClientMode(
  options: CreateStaticRpcClientModeOptions,
): Promise<DevToolsRpcClientMode> {
  const manifest = await options.fetchJsonFromBases(DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME)
  const staticCaller = createStaticRpcCaller(manifest, options.fetchJsonFromBases)

  return {
    isTrusted: true,
    requestTrust: async () => true,
    requestTrustWithToken: async () => true,
    ensureTrusted: async () => true,
    call: (...args: any): any => staticCaller.call(
      args[0] as string,
      args.slice(1),
    ),
    callEvent: (...args: any): any => staticCaller.callEvent(
      args[0] as string,
      args.slice(1),
    ),
    callOptional: (...args: any): any => staticCaller.callOptional(
      args[0] as string,
      args.slice(1),
    ),
  }
}
