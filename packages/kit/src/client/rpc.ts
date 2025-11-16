import type { WebSocketRpcClientOptions } from '@vitejs/devtools-rpc/presets/ws/client'
import type { BirpcOptions, BirpcReturn } from 'birpc'
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '../types'
import type { DevToolsClientContext, DevToolsClientRpcHost } from './docks'
import { createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'
import { RpcFunctionsCollectorBase } from 'birpc-x'

const CONNECTION_META_KEY = '__VITE_DEVTOOLS_CONNECTION_META__'

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

export type DevToolsRpcClient = BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>

export interface ClientRpcReturn {
  connectionMeta: ConnectionMeta
  rpc: DevToolsRpcClient
  clientRpc: DevToolsClientRpcHost
}

function findConnectionMetaFromWindows(): ConnectionMeta | undefined {
  const getters = [
    () => (window as any)[CONNECTION_META_KEY],
    () => (globalThis as any)[CONNECTION_META_KEY],
    () => (parent.window as any)[CONNECTION_META_KEY],
  ]

  for (const getter of getters) {
    try {
      const value = getter()
      if (value)
        return value
    }
    catch {}
  }
}

export async function getDevToolsRpcClient(
  options: DevToolsRpcClientOptions = {},
): Promise<ClientRpcReturn> {
  const {
    baseURL = '/.devtools/',
    rpcOptions = {},
  } = options
  const bases = Array.isArray(baseURL) ? baseURL : [baseURL]
  let connectionMeta: ConnectionMeta | undefined = options.connectionMeta || findConnectionMetaFromWindows()

  if (!connectionMeta) {
    const errors: Error[] = []
    for (const base of bases) {
      try {
        connectionMeta = await fetch(`${base}.vdt-connection.json`)
          .then(r => r.json()) as ConnectionMeta
        ;(globalThis as any)[CONNECTION_META_KEY] = connectionMeta
        break
      }
      catch (e) {
        errors.push(e as Error)
      }
    }
    if (!connectionMeta) {
      throw new Error(`Failed to get connection meta from ${bases.join(', ')}`, {
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
      rpcOptions,
    },
  )
  // @ts-expect-error assign to readonly property
  context.rpc = rpc

  return {
    connectionMeta,
    rpc,
    clientRpc,
  }
}
