import type { BirpcOptions, BirpcReturn } from 'birpc'
import type { RpcCacheOptions, RpcFunctionsCollector } from 'devframe/rpc'
import type { WsRpcChannelOptions } from 'devframe/rpc/transports/ws-client'
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, EventEmitter, RpcSharedStateHost } from 'devframe/types'
import type { RpcStreamingClientHost } from './rpc-streaming'
import {
  DEVTOOLS_CONNECTION_META_FILENAME,
} from 'devframe/constants'
import { RpcCacheManager, RpcFunctionsCollectorBase } from 'devframe/rpc'
import { createEventEmitter } from 'devframe/utils/events'
import { humanId } from 'devframe/utils/human-id'
import { createRpcSharedStateClientHost } from './rpc-shared-state'
import { createStaticRpcClientMode } from './rpc-static'
import { createRpcStreamingClientHost } from './rpc-streaming'
import { createWsRpcClientMode } from './rpc-ws'

export interface DevToolsRpcContext {
  /**
   * The RPC client to interact with the server
   */
  readonly rpc: DevToolsRpcClient
}

export type DevToolsClientRpcHost = RpcFunctionsCollector<DevToolsRpcClientFunctions, DevToolsRpcContext>

export interface RpcClientEvents {
  'rpc:is-trusted:updated': (isTrusted: boolean) => void
}

const CONNECTION_META_KEY = '__VITE_DEVTOOLS_CONNECTION_META__'
const CONNECTION_AUTH_TOKEN_KEY = '__VITE_DEVTOOLS_CONNECTION_AUTH_TOKEN__'

export interface DevToolsRpcClientOptions {
  connectionMeta?: ConnectionMeta
  baseURL?: string | string[]
  /**
   * The auth token to use for the client
   */
  authToken?: string
  wsOptions?: Partial<WsRpcChannelOptions>
  rpcOptions?: Partial<BirpcOptions<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions, boolean>>
  cacheOptions?: boolean | Partial<RpcCacheOptions>
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
   * Request trust from the server using a specific auth token.
   * Updates the stored token and re-requests trust without reloading the page.
   */
  requestTrustWithToken: (token: string) => Promise<boolean>

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
  /**
   * The streaming channel host. Subscribe to a server-side stream by
   * channel + id; the returned reader is both `AsyncIterable<T>` and
   * exposes `.readable: ReadableStream<T>` for `pipeTo` consumption.
   */
  streaming: RpcStreamingClientHost
  /**
   * The RPC cache manager
   */
  cacheManager: RpcCacheManager
}

export interface DevToolsRpcClientMode {
  readonly isTrusted: boolean
  ensureTrusted: DevToolsRpcClient['ensureTrusted']
  requestTrust: DevToolsRpcClient['requestTrust']
  requestTrustWithToken: DevToolsRpcClient['requestTrustWithToken']
  call: DevToolsRpcClient['call']
  callEvent: DevToolsRpcClient['callEvent']
  callOptional: DevToolsRpcClient['callOptional']
}

function getConnectionAuthTokenFromWindows(userAuthToken?: string): string {
  const getters = [
    () => userAuthToken,
    () => localStorage.getItem(CONNECTION_AUTH_TOKEN_KEY),
    () => (window as any)?.[CONNECTION_AUTH_TOKEN_KEY],
    () => (globalThis as any)?.[CONNECTION_AUTH_TOKEN_KEY],
    () => (parent.window as any)?.[CONNECTION_AUTH_TOKEN_KEY],
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
    value = humanId()

  localStorage.setItem(CONNECTION_AUTH_TOKEN_KEY, value)
  ;(globalThis as any)[CONNECTION_AUTH_TOKEN_KEY] = value
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
  // Default to a relative base — the SPA owns its mount path at runtime,
  // so the connection meta and dump shards live alongside `index.html`.
  // Embedded surfaces that run inside a host page (e.g. the Vite DevTools
  // webcomponent inject) must pass an explicit `baseURL` because their
  // `document.baseURI` points at the host app, not the devtool's mount.
  const {
    baseURL = './',
    rpcOptions = {},
    cacheOptions = false,
  } = options
  const events = createEventEmitter<RpcClientEvents>()
  const bases = Array.isArray(baseURL) ? baseURL : [baseURL]
  let connectionMeta: ConnectionMeta | undefined = options.connectionMeta || findConnectionMetaFromWindows()
  let resolvedBaseURL = bases[0] ?? './'

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

  const cacheManager = new RpcCacheManager({ functions: [], ...(typeof options.cacheOptions === 'object' ? options.cacheOptions : {}) })
  const context: DevToolsRpcContext = {
    rpc: undefined!,
  }
  const authToken = getConnectionAuthTokenFromWindows(options.authToken)
  const clientRpc: DevToolsClientRpcHost = new RpcFunctionsCollectorBase<DevToolsRpcClientFunctions, DevToolsRpcContext>(context)

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
        authToken,
        connectionMeta,
        events,
        clientRpc,
        rpcOptions: {
          ...rpcOptions,
          async onRequest(req, next, resolve) {
            await rpcOptions.onRequest?.call(this, req, next, resolve)
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
    requestTrustWithToken: async (token: string) => {
      // Update stored token for future reconnections
      localStorage.setItem(CONNECTION_AUTH_TOKEN_KEY, token)
      ;(globalThis as any)[CONNECTION_AUTH_TOKEN_KEY] = token
      return mode.requestTrustWithToken(token)
    },
    call: mode.call,
    callEvent: mode.callEvent,
    callOptional: mode.callOptional,
    client: clientRpc,
    sharedState: undefined!,
    streaming: undefined!,
    cacheManager,
  }

  rpc.sharedState = createRpcSharedStateClientHost(rpc)
  rpc.streaming = createRpcStreamingClientHost(rpc)

  // @ts-expect-error assign to readonly property
  context.rpc = rpc
  void mode.requestTrust()

  // Listen for auth updates from other tabs (e.g., auth URL page)
  try {
    const bc = new BroadcastChannel('vite-devtools-auth')
    bc.onmessage = (event) => {
      if (event.data?.type === 'auth-update' && event.data.authToken) {
        rpc.requestTrustWithToken(event.data.authToken)
      }
    }
  }
  catch {}

  return rpc
}
