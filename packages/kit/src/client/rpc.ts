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

export interface DevToolsRpcClientOptions {
  connectionMeta?: ConnectionMeta
  baseURL?: string[]
  cacheResponse?: boolean
  wsOptions?: Partial<WebSocketRpcClientOptions>
  rpcOptions?: Partial<BirpcOptions<DevToolsRpcServerFunctions>>
}

export type DevToolsRpcClient = BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>

export interface ClientRpcReturn {
  connectionMeta: ConnectionMeta
  rpc: DevToolsRpcClient
  clientRpc: DevToolsClientRpcHost
  invalidateCache: () => void
}

export async function getDevToolsRpcClient(
  options: DevToolsRpcClientOptions = {},
): Promise<ClientRpcReturn> {
  const {
    baseURL = '/.devtools/',
    rpcOptions = {},
    cacheResponse = false,
  } = options
  const urls = Array.isArray(baseURL) ? baseURL : [baseURL]
  const responseCacheMap = new Map<string, unknown>()
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
          if (cacheResponse) {
            const cacheKey = `${req.m}-${JSON.stringify(req.a)}`
            if (responseCacheMap.has(cacheKey)) {
              resolve(responseCacheMap.get(cacheKey))
            }
            else {
              responseCacheMap.set(cacheKey, await next(req))
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

  function invalidateCache(key?: string) {
    if (key) {
      responseCacheMap.delete(key)
    }
    else {
      responseCacheMap.clear()
    }
  }

  return {
    connectionMeta,
    rpc,
    clientRpc,
    invalidateCache,
  }
}
