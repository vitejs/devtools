import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, EventEmitter } from '../types'
import type { DevToolsClientRpcHost, RpcClientEvents } from './docks'
import type { DevToolsRpcClientMode, DevToolsRpcClientOptions } from './rpc'
import { createRpcClient } from '@vitejs/devtools-rpc/client'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'
import { parseUA } from 'ua-parser-modern'
import { promiseWithResolver } from '../utils/promise'

export interface CreateWsRpcClientModeOptions {
  authToken: string
  connectionMeta: ConnectionMeta
  events: EventEmitter<RpcClientEvents>
  clientRpc: DevToolsClientRpcHost
  rpcOptions?: DevToolsRpcClientOptions['rpcOptions']
  wsOptions?: DevToolsRpcClientOptions['wsOptions']
}

function isNumeric(str: string | number | undefined) {
  if (str == null)
    return false
  return `${+str}` === `${str}`
}

export function createWsRpcClientMode(
  options: CreateWsRpcClientModeOptions,
): DevToolsRpcClientMode {
  const {
    authToken,
    connectionMeta,
    events,
    clientRpc,
    rpcOptions = {},
    wsOptions = {},
  } = options

  let isTrusted = false
  const trustedPromise = promiseWithResolver<boolean>()
  const url = isNumeric(connectionMeta.websocket)
    ? `${location.protocol.replace('http', 'ws')}//${location.hostname}:${connectionMeta.websocket}`
    : connectionMeta.websocket as string

  const serverRpc = createRpcClient<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>(
    clientRpc.functions,
    {
      preset: createWsRpcPreset({
        url,
        authToken,
        ...wsOptions,
      }),
      rpcOptions,
    },
  )

  // Handle server-initiated auth revocation
  clientRpc.register({
    name: 'devtoolskit:internal:auth:revoked',
    type: 'event',
    handler: () => {
      isTrusted = false
      events.emit('rpc:is-trusted:updated', false)
    },
  })

  async function requestTrust() {
    if (isTrusted)
      return true

    const info = parseUA(navigator.userAgent)
    const ua = [
      info.browser.name,
      info.browser.version,
      '|',
      info.os.name,
      info.os.version,
      info.device.type,
    ].filter(i => i).join(' ')

    const result = await serverRpc.$call('vite:anonymous:auth', {
      authToken,
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

  return {
    get isTrusted() {
      return isTrusted
    },
    requestTrust,
    ensureTrusted,
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
  }
}
