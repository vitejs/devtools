import type { WebSocketRpcClientOptions } from '@vitejs/devtools-rpc/presets/ws/client'
import type { BirpcOptions, BirpcReturn } from 'birpc'
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '../types'
import type { DevToolsClientContext, DevToolsClientRpcHost } from './docks'
import { createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'
import { RpcFunctionsCollectorBase } from 'birpc-x'

function isNumeric(str: string | number | undefined) {
  if (str == null)
    return false
  return `${+str}` === `${str}`
}

interface RpcCacheOptions {
  functions: string[]
}

// @TODO: should be moved to birpc-x?
class RpcCacheManager {
  private cacheMap = new Map<string, Map<string, unknown>>()
  private options: RpcCacheOptions

  constructor(options: RpcCacheOptions) {
    this.options = options
  }

  updateOptions(options: Partial<RpcCacheOptions>) {
    this.options = {
      ...this.options,
      ...options,
    }
  }

  cached(m: string, a: unknown[]) {
    const methodCache = this.cacheMap.get(m)
    if (methodCache) {
      return methodCache.get(JSON.stringify(a))
    }
    return undefined
  }

  apply(req: { m: string, a: unknown[] }, res: unknown) {
    const methodCache = this.cacheMap.get(req.m) || new Map<string, unknown>()
    methodCache.set(JSON.stringify(req.a), res)
    this.cacheMap.set(req.m, methodCache)
  }

  validate(m: string) {
    return this.options.functions.includes(m)
  }

  invalidate(key?: string) {
    if (key) {
      this.cacheMap.delete(key)
    }
    else {
      this.cacheMap.clear()
    }
  }
}

export interface DevToolsRpcClientOptions {
  connectionMeta?: ConnectionMeta
  baseURL?: string[]
  wsOptions?: Partial<WebSocketRpcClientOptions>
  rpcOptions?: Partial<BirpcOptions<DevToolsRpcServerFunctions>>
  cacheOptions?: boolean | Partial<RpcCacheOptions>
}

export type DevToolsRpcClient = BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>

export interface ClientRpcReturn {
  connectionMeta: ConnectionMeta
  rpc: DevToolsRpcClient
  clientRpc: DevToolsClientRpcHost
}

export async function getDevToolsRpcClient(
  options: DevToolsRpcClientOptions & { cacheOptions: false },
): Promise<ClientRpcReturn>
export async function getDevToolsRpcClient(
  options: DevToolsRpcClientOptions & { cacheOptions: true },
): Promise<ClientRpcReturn & { cacheManager: RpcCacheManager }>
export async function getDevToolsRpcClient(
  options: DevToolsRpcClientOptions & { cacheOptions: Partial<RpcCacheOptions> },
): Promise<ClientRpcReturn & { cacheManager: RpcCacheManager }>
export async function getDevToolsRpcClient(
  options?: DevToolsRpcClientOptions,
): Promise<ClientRpcReturn>
export async function getDevToolsRpcClient(
  options: DevToolsRpcClientOptions = {},
): Promise<ClientRpcReturn> {
  const {
    baseURL = '/.devtools/',
    rpcOptions = {},
    cacheOptions = false,
  } = options
  const urls = Array.isArray(baseURL) ? baseURL : [baseURL]
  let connectionMeta: ConnectionMeta | undefined = options.connectionMeta

  if (!connectionMeta) {
    const errors: Error[] = []
    for (const url of urls) {
      try {
        connectionMeta = await fetch(`${url}.vdt-connection.json`)
          .then(r => r.json()) as ConnectionMeta
        break
      }
      catch (e) {
        errors.push(e as Error)
      }
    }
    if (!connectionMeta) {
      throw new Error(`Failed to get connection meta from ${urls.join(', ')}`, {
        cause: errors,
      })
    }
  }

  const url = isNumeric(connectionMeta.websocket)
    ? `${location.protocol.replace('http', 'ws')}//${location.hostname}:${connectionMeta.websocket}`
    : connectionMeta.websocket as string

  const cacheManager = cacheOptions ? new RpcCacheManager({ functions: [], ...(typeof options.cacheOptions === 'object' ? options.cacheOptions : {}) }) : null
  const context: DevToolsClientContext = {
    rpc: undefined!,
  }
  const clientRpc: DevToolsClientRpcHost = new RpcFunctionsCollectorBase<DevToolsRpcClientFunctions, DevToolsClientContext>(context)
  const rpc = createRpcClient<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>(
    clientRpc.functions,
    {
      preset: createWsRpcPreset({
        url,
        ...options.wsOptions,
      }),
      rpcOptions: {
        ...rpcOptions,
        onRequest: async (req, next, resolve) => {
          await rpcOptions.onRequest?.(req, next, resolve)
          if (cacheOptions && cacheManager?.validate(req.m)) {
            const cached = cacheManager.cached(req.m, req.a)
            if (cached) {
              return resolve(cached)
            }
            else {
              const res = await next(req)
              cacheManager?.apply(req, res)
            }
          }
          else {
            await next(req)
          }
        },
      },
    },
  )
  // @ts-expect-error assign to readonly property
  context.rpc = rpc

  return {
    connectionMeta,
    rpc,
    clientRpc,
    ...(cacheOptions ? { cacheManager } : {}),
  }
}
