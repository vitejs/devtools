import type { WebSocketRpcClientOptions } from '@vitejs/devtools-rpc/presets/ws/client'
import type { BirpcOptions, BirpcReturn } from 'birpc'
import type { ConnectionMeta, DevToolsDockEntry, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '../types'
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

/**
 * Context for client scripts running in dock entries
 */
export interface DockClientScriptContext {
  /**
   * The dock entry info of the current dock item
   */
  dockEntry: DevToolsDockEntry
  /**
   * The current state of the dock
   */
  dockState: 'active' | 'inactive'
  /**
   * Type of the client environment
   *
   * 'embedded' - running inside an embedded floating panel
   * 'standalone' - running inside a standlone window (no user app)
   */
  clientType: 'embedded' | 'standalone'
  /**
   * Function to hide the panel, if applicable
   */
  hidePanel: () => void
  /**
   * The panel element to mount into, if applicable
   */
  elPanel?: HTMLElement | null
}

export async function getDevToolsRpcClient(
  options: DevToolsRpcClientOptions = {},
): Promise<{
  connectionMeta: ConnectionMeta
  rpc: BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>
}> {
  const {
    baseURL = '/.devtools/',
    rpcOptions = {},
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
    rpcOptions,
  })

  return {
    connectionMeta,
    rpc,
  }
}
