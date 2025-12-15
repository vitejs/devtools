import type { WebSocketRpcClientOptions } from '@vitejs/devtools-rpc/presets/ws/client'
import type { BirpcOptions, BirpcReturn } from 'birpc'
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, EventEmitter } from '../types'
import type { DevToolsClientContext, DevToolsClientRpcHost, RpcClientEvents } from './docks'
import { createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'
import { RpcFunctionsCollectorBase } from 'birpc-x'
import { createEventEmitter } from '../utils/events'

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
  rpcOptions?: Partial<BirpcOptions<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions, boolean>>
}

export interface DevToolsRpcClient {
  /**
   * The events of the client
   */
  events: EventEmitter<RpcClientEvents>
  /**
   * The connection meta
   */
  readonly connectionMeta: ConnectionMeta
  /**
   * Call a RPC function on the server
   */
  call: BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>['$call']
  /**
   * Call a RPC event on the server, and does not expect a response
   */
  callEvent: BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>['$callEvent']
  /**
   * Call a RPC optional function on the server
   */
  callOptional: BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>['$callOptional']
  /**
   * The client RPC host
   */
  client: DevToolsClientRpcHost
}

function findConnectionMetaFromWindows(): ConnectionMeta | undefined {
  const getters = [
    () => (window as any)?.[CONNECTION_META_KEY],
    () => (globalThis as any)?.[CONNECTION_META_KEY],
    () => (parent.window as any)?.[CONNECTION_META_KEY],
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
): Promise<DevToolsRpcClient> {
  const {
    baseURL = '/.devtools/',
    rpcOptions = {},
  } = options
  const events = createEventEmitter<RpcClientEvents>()
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

  // Create the RPC client
  const serverRpc = createRpcClient<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>(
    clientRpc.functions,
    {
      preset: createWsRpcPreset({
        url,
        ...options.wsOptions,
      }),
      rpcOptions,
    },
  )

  const rpc: DevToolsRpcClient = {
    events,
    connectionMeta,
    call: (...args: any): any => {
      // @ts-expect-error casting
      return serverRpc.call(...args)
    },
    callEvent: (...args: any): any => {
      // @ts-expect-error casting
      return serverRpc.callEvent(...args)
    },
    callOptional: (...args: any): any => {
      // @ts-expect-error casting
      return serverRpc.callOptional(...args)
    },
    client: clientRpc,
  }

  // @ts-expect-error assign to readonly property
  context.rpc = rpc

  return rpc
}
