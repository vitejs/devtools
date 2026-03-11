import type { WebSocketRpcClientOptions } from '@vitejs/devtools-rpc/presets/ws/client'
import type { BirpcOptions, BirpcReturn } from 'birpc'
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, EventEmitter, RpcSharedStateHost } from '../types'
import type { DevToolsClientContext, DevToolsClientRpcHost, RpcClientEvents } from './docks'
import { RpcFunctionsCollectorBase } from '@vitejs/devtools-rpc'
import {
  DEVTOOLS_CONNECTION_META_FILENAME,
  DEVTOOLS_MOUNT_PATH,
} from '../constants'
import { createEventEmitter } from '../utils/events'
import { nanoid } from '../utils/nanoid'
import { createRpcSharedStateClientHost } from './rpc-shared-state'
import { createStaticRpcClientMode } from './rpc-static'
import { createWsRpcClientMode } from './rpc-ws'

const CONNECTION_META_KEY = '__VITE_DEVTOOLS_CONNECTION_META__'
const CONNECTION_AUTH_ID_KEY = '__VITE_DEVTOOLS_CONNECTION_AUTH_ID__'

export interface DevToolsRpcClientOptions {
  connectionMeta?: ConnectionMeta
  baseURL?: string | string[]
  /**
   * The auth id to use for the client
   */
  authId?: string
  wsOptions?: Partial<WebSocketRpcClientOptions>
  rpcOptions?: Partial<BirpcOptions<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions, boolean>>
}

export type DevToolsRpcClientCall = BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>['$call']
export type DevToolsRpcClientCallEvent = BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>['$callEvent']
export type DevToolsRpcClientCallOptional = BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>['$callOptional']

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
  call: DevToolsRpcClientCall
  /**
   * Call a RPC event on the server, and does not expect a response
   */
  callEvent: DevToolsRpcClientCallEvent
  /**
   * Call a RPC optional function on the server
   */
  callOptional: DevToolsRpcClientCallOptional
  /**
   * The client RPC host
   */
  client: DevToolsClientRpcHost

  /**
   * The shared state host
   */
  sharedState: RpcSharedStateHost
}

export interface DevToolsRpcClientMode {
  readonly isTrusted: boolean
  ensureTrusted: DevToolsRpcClient['ensureTrusted']
  requestTrust: DevToolsRpcClient['requestTrust']
  call: DevToolsRpcClient['call']
  callEvent: DevToolsRpcClient['callEvent']
  callOptional: DevToolsRpcClient['callOptional']
}

function getConnectionAuthIdFromWindows(userAuthId?: string): string {
  const getters = [
    () => userAuthId,
    () => localStorage.getItem(CONNECTION_AUTH_ID_KEY),
    () => (window as any)?.[CONNECTION_AUTH_ID_KEY],
    () => (globalThis as any)?.[CONNECTION_AUTH_ID_KEY],
    () => (parent.window as any)?.[CONNECTION_AUTH_ID_KEY],
  ]

  let value: string | undefined

  for (const getter of getters) {
    try {
      value = getter()
      if (value)
        break
    }
    catch {}
  }

  if (!value)
    value = nanoid()

  localStorage.setItem(CONNECTION_AUTH_ID_KEY, value)
  ;(globalThis as any)[CONNECTION_AUTH_ID_KEY] = value
  return value
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
    baseURL = DEVTOOLS_MOUNT_PATH,
    rpcOptions = {},
  } = options
  const events = createEventEmitter<RpcClientEvents>()
  const bases = Array.isArray(baseURL) ? baseURL : [baseURL]
  let connectionMeta: ConnectionMeta | undefined = options.connectionMeta || findConnectionMetaFromWindows()
  let resolvedBaseURL = bases[0] ?? DEVTOOLS_MOUNT_PATH

  function normalizeBase(base: string): string {
    return base.endsWith('/') ? base : `${base}/`
  }

  function resolveBasePath(base: string, path: string): string {
    if (/^https?:\/\//.test(path))
      return path
    if (path.startsWith('/'))
      return path
    return `${normalizeBase(base)}${path}`
  }

  if (!connectionMeta) {
    const errors: Error[] = []
    for (const base of bases) {
      try {
        connectionMeta = await fetch(resolveBasePath(base, DEVTOOLS_CONNECTION_META_FILENAME))
          .then(r => r.json()) as ConnectionMeta
        resolvedBaseURL = base
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

  const context: DevToolsClientContext = {
    rpc: undefined!,
  }
  const authId = getConnectionAuthIdFromWindows(options.authId)
  const clientRpc: DevToolsClientRpcHost = new RpcFunctionsCollectorBase<DevToolsRpcClientFunctions, DevToolsClientContext>(context)

  async function fetchJsonFromBases(path: string): Promise<any> {
    const candidates = [
      resolvedBaseURL,
      ...bases.filter(base => base !== resolvedBaseURL),
    ].filter(x => x != null)

    const errors: Error[] = []
    for (const base of candidates) {
      try {
        return await fetch(resolveBasePath(base, path)).then((r) => {
          if (!r.ok) {
            throw new Error(`Failed to fetch ${path} from ${base}: ${r.status}`)
          }
          return r.json()
        })
      }
      catch (error) {
        errors.push(error as Error)
      }
    }

    throw new Error(`Failed to load ${path} from ${candidates.join(', ')}`, {
      cause: errors,
    })
  }

  const mode = connectionMeta.backend === 'static'
    ? await createStaticRpcClientMode({
        fetchJsonFromBases,
      })
    : createWsRpcClientMode({
        authId,
        connectionMeta,
        events,
        clientRpc,
        rpcOptions,
        wsOptions: options.wsOptions,
      })

  const rpc: DevToolsRpcClient = {
    events,
    get isTrusted() {
      return mode.isTrusted
    },
    connectionMeta,
    ensureTrusted: mode.ensureTrusted,
    requestTrust: mode.requestTrust,
    call: mode.call,
    callEvent: mode.callEvent,
    callOptional: mode.callOptional,
    client: clientRpc,
    sharedState: undefined!,
  }

  rpc.sharedState = createRpcSharedStateClientHost(rpc)

  // @ts-expect-error assign to readonly property
  context.rpc = rpc
  void mode.requestTrust()

  return rpc
}
