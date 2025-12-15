import type { WebSocketRpcClientOptions } from '@vitejs/devtools-rpc/presets/ws/client'
import type { BirpcOptions, BirpcReturn } from 'birpc'
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, EventEmitter } from '../types'
import type { DevToolsClientContext, DevToolsClientRpcHost, RpcClientEvents } from './docks'
import { createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'
import { RpcFunctionsCollectorBase } from 'birpc-x'
import { UAParser } from 'my-ua-parser'
import { createEventEmitter } from '../utils/events'
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
  rpcOptions?: Partial<BirpcOptions<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions, boolean>>
}

export interface DevToolsRpcClient {
  /**
   * The events of the client
   */
  events: EventEmitter<RpcClientEvents>

  /**
   * Whether the client is trusted
   */
  readonly isTrusted: boolean | null
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
  ensureTrusted: (timeout?: number) => Promise<boolean>

  /**
   * Request trust from the server
   */
  requestTrust: () => Promise<boolean>

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
  const authId = getConnectionAuthIdFromWindows()

  let isTrusted = false
  const trustedPromise = promiseWithResolver<boolean>()

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

  async function requestTrust() {
    if (isTrusted)
      return true

    const info = new UAParser(navigator.userAgent).getResult()
    const ua = [
      info.browser.name,
      info.browser.version,
      '|',
      info.os.name,
      info.os.version,
      info.device.type,
    ].filter(i => i).join(' ')

    const result = await serverRpc.$call('vite:anonymous:auth', {
      authId,
      ua,
      origin: location.origin,
    })

    isTrusted = result.isTrusted
    trustedPromise.resolve(isTrusted)
    events.emit('rpc:is-trusted:updated', isTrusted)
    return result.isTrusted
  }

  async function ensureTrusted(timeout = 60_000): Promise<boolean> {
    if (isTrusted)
      trustedPromise.resolve(true)

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

    return isTrusted
  }

  const rpc: DevToolsRpcClient = {
    events,
    get isTrusted() {
      return isTrusted
    },
    connectionMeta,
    ensureTrusted,
    requestTrust,
    call: (...args: any): any => {
      return serverRpc.$call(
        // @ts-expect-error casting
        ...args,
      )
    },
    callEvent: (...args: any): any => {
      return serverRpc.$callEvent(
        // @ts-expect-error casting
        ...args,
      )
    },
    callOptional: (...args: any): any => {
      return serverRpc.$callOptional(
        // @ts-expect-error casting
        ...args,
      )
    },
    client: clientRpc,
  }

  // @ts-expect-error assign to readonly property
  context.rpc = rpc
  requestTrust()

  return rpc
}
