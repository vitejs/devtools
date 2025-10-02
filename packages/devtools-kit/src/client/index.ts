import type { WebSocketRpcClientOptions } from '@vitejs/devtools-rpc/presets/ws/client'
import type { BirpcOptions, BirpcReturn } from 'birpc'
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '../types'
import { createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'

function isNumeric(str: string | number | undefined) {
  if (str == null)
    return false
  return `${+str}` === `${str}`
}

export interface DevToolsRpcClientOptions {
  connectionMeta?: ConnectionMeta
  baseURL?: string[]
  wsOptions?: Partial<WebSocketRpcClientOptions>
  rpcOptions?: Partial<BirpcOptions<DevToolsRpcServerFunctions>>
}

export async function getDevToolsRpcClient(
  options: DevToolsRpcClientOptions = {},
): Promise<{
  connectionMeta: ConnectionMeta
  rpc: BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>
}> {
  const {
    baseURL = '/.devtools/',
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

  const rpc = createRpcClient<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>({}, {
    preset: createWsRpcPreset({
      url,
      ...options.wsOptions,
    }),
    ...options.rpcOptions,
  })

  return {
    connectionMeta,
    rpc,
  }
}
