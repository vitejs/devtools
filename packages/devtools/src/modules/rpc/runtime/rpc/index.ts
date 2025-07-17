import type { ServerFunctions } from '../../../../node/rpc'
import type { ClientFunctions, ConnectionMeta } from '../../../../shared/types'
import { useRuntimeConfig } from '#app/nuxt'
import { createRpcClient as _createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'

export async function getMetadata() {
  const config = useRuntimeConfig()
  const baseURL = config.app.baseURL
  const metadata: ConnectionMeta = await fetch(`${baseURL}api/metadata.json`)
    .then(r => r.json())

  return metadata
}

export function createRpcClient(url: string) {
  const clientFunctions = {} as ClientFunctions

  const rpc = _createRpcClient<ServerFunctions, ClientFunctions>(clientFunctions, {
    preset: createWsRpcPreset({
      url,
    }),
  })

  return rpc
}
