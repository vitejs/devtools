import type { PeerDescriptor } from '@vitejs/devtools-rpc/peer'
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, EventEmitter } from '../types'
import type { DevToolsClientRpcHost, RpcClientEvents } from './docks'
import type { DevToolsRpcClientMode, DevToolsRpcClientOptions } from './rpc'
import { PeerMesh } from '@vitejs/devtools-rpc/peer'
import { createWsClientAdapter } from '@vitejs/devtools-rpc/peer/adapters/ws-client'
import { parseUA } from 'ua-parser-modern'
import { promiseWithResolver } from '../utils/promise'

export interface CreateWsRpcClientModeOptions {
  authToken: string
  connectionMeta: ConnectionMeta
  events: EventEmitter<RpcClientEvents>
  clientRpc: DevToolsClientRpcHost
  rpcOptions?: DevToolsRpcClientOptions['rpcOptions']
  wsOptions?: DevToolsRpcClientOptions['wsOptions']
  /** Self-descriptor for this peer. Provided by the bootstrap layer. */
  self: PeerDescriptor
}

const DEVTOOLS_SERVER_PEER_ID = 'devtools-server'

function isNumeric(str: string | number | undefined) {
  if (str == null)
    return false
  return `${+str}` === `${str}`
}

export async function createWsRpcClientMode(
  options: CreateWsRpcClientModeOptions,
): Promise<DevToolsRpcClientMode & { mesh: PeerMesh }> {
  const {
    authToken,
    connectionMeta,
    events,
    clientRpc,
    rpcOptions = {},
    wsOptions = {},
    self,
  } = options

  let isTrusted = false
  const trustedPromise = promiseWithResolver<boolean>()
  const url = isNumeric(connectionMeta.websocket)
    ? `${location.protocol.replace('http', 'ws')}//${location.hostname}:${connectionMeta.websocket}`
    : connectionMeta.websocket as string

  const mesh = new PeerMesh({ self })

  const remote: PeerDescriptor = {
    id: DEVTOOLS_SERVER_PEER_ID,
    role: 'devtools-server',
    capabilities: ['rpc-relay', 'directory'],
    meta: {},
    links: [{ transport: 'ws', priority: 100 }],
  }

  // Handle server-initiated auth revocation
  clientRpc.register({
    name: 'devtoolskit:internal:auth:revoked',
    type: 'event',
    handler: () => {
      isTrusted = false
      events.emit('rpc:is-trusted:updated', false)
    },
  })

  const adapter = createWsClientAdapter<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>({
    url,
    authToken,
    clientFunctions: clientRpc.functions,
    remote,
    rpcOptions,
    onConnected: wsOptions.onConnected,
    onError: wsOptions.onError,
    onDisconnected: wsOptions.onDisconnected,
  })

  await mesh.register(adapter)
  const serverHandle = mesh.peer(DEVTOOLS_SERVER_PEER_ID)

  let currentAuthToken = authToken

  async function requestTrustWithToken(token: string) {
    currentAuthToken = token

    const info = parseUA(navigator.userAgent)
    const ua = [
      info.browser.name,
      info.browser.version,
      '|',
      info.os.name,
      info.os.version,
      info.device.type,
    ].filter(i => i).join(' ')

    const result = await serverHandle.call('vite:anonymous:auth', {
      authToken: token,
      ua,
      origin: location.origin,
    }) as { isTrusted: boolean }

    isTrusted = result.isTrusted
    trustedPromise.resolve(isTrusted)
    events.emit('rpc:is-trusted:updated', isTrusted)
    return result.isTrusted
  }

  async function requestTrust() {
    if (isTrusted)
      return true
    return requestTrustWithToken(currentAuthToken)
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

  return {
    get isTrusted() {
      return isTrusted
    },
    requestTrust,
    requestTrustWithToken,
    ensureTrusted,
    call: (...args: any): any => {
      return serverHandle.call(...(args as [any, ...any[]]))
    },
    callEvent: (...args: any): any => {
      return serverHandle.callEvent(...(args as [any, ...any[]]))
    },
    callOptional: (...args: any): any => {
      return serverHandle.callOptional(...(args as [any, ...any[]]))
    },
    mesh,
  }
}
