import type { WebSocketRpcClientOptions } from '@vitejs/devtools-rpc/presets/ws/client'
import type { BirpcReturn, EventOptions } from 'birpc'
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '../types'
import type { DevToolsClientContext, DevToolsClientRpcHost } from './docks'
import { createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'
import { RpcFunctionsCollectorBase } from 'birpc-x'
import { nanoid } from '../utils/nanoid'
import { promiseWithResolver } from '../utils/promise'

const CONNECTION_META_KEY = '__VITE_DEVTOOLS_CONNECTION_META__'
const CONNECTION_AUTH_ID_KEY = '__VITE_DEVTOOLS_CONNECTION_AUTH_ID__'

function isNumeric(str: string | number | undefined) {
  if (str == null)
    return false
  return `${+str}` === `${str}`
}

export interface DevToolsRpcClientOptions {
  connectionMeta?: ConnectionMeta
  baseURL?: string[]
  wsOptions?: Partial<WebSocketRpcClientOptions>
  rpcOptions?: EventOptions<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>
}

export interface DevToolsRpcClient {
  /**
   * Whether the client is trusted
   */
  readonly isTrusted: boolean
  /**
   * The connection meta
   */
  readonly connectionMeta: ConnectionMeta
  /**
   * Return a promise that resolves when the client is trusted
   *
   * Rejects with an error if the timeout is reached
   *
   * @param timeout - The timeout in milliseconds, default to 60 seconds
   */
  ensureTrusted: (timeout?: number) => Promise<void>

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

function getConnectionAuthIdFromWindows(): string {
  const getters = [
    () => localStorage.getItem(CONNECTION_AUTH_ID_KEY),
    () => (window as any)?.[CONNECTION_AUTH_ID_KEY],
    () => (globalThis as any)?.[CONNECTION_AUTH_ID_KEY],
    () => (parent.window as any)?.[CONNECTION_AUTH_ID_KEY],
  ]

  for (const getter of getters) {
    try {
      const value = getter()
      if (value) {
        if (!localStorage.getItem(CONNECTION_AUTH_ID_KEY))
          localStorage.setItem(CONNECTION_AUTH_ID_KEY, value)
        return value
      }
    }
    catch {}
  }

  const uid = nanoid()
  localStorage.setItem(CONNECTION_AUTH_ID_KEY, uid)
  return uid
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
  const authId = getConnectionAuthIdFromWindows()

  let isTrusted = false
  const trustedPromise = promiseWithResolver<void>()

  const clientRpc: DevToolsClientRpcHost = new RpcFunctionsCollectorBase<DevToolsRpcClientFunctions, DevToolsClientContext>(context)

  // Builtin rpc functions
  clientRpc.register({
    name: 'vite:anonymous:trusted',
    type: 'event',
    handler: () => {
      isTrusted = true
      trustedPromise.resolve()
      return true
    },
  })

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

  // TODO: implement the trust logic
  serverRpc.$call('vite:anonymous:auth', {
    authId,
    ua: navigator.userAgent,
  })

  async function ensureTrusted(timeout = 60_000): Promise<void> {
    if (isTrusted)
      trustedPromise.resolve()

    if (timeout <= 0)
      return trustedPromise.promise

    let clear = () => {}
    await Promise.race([
      trustedPromise.promise.then(clear),
      new Promise((resolve, reject) => {
        const id = setTimeout(() => {
          reject(new Error('[Vite DevTools] Timeout waiting for rpc to be trusted'))
        }, timeout)
        clear = () => clearTimeout(id)
      }),
    ])
  }

  const rpc: DevToolsRpcClient = {
    get isTrusted() {
      return isTrusted
    },
    connectionMeta,
    ensureTrusted,
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
