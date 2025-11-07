/// <reference types="vite/client" />
/// <reference lib="dom" />

import type { DockPanelState } from '../webcomponents'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { useLocalStorage } from '@vueuse/core'
import { createDockContext } from '../webcomponents'

export async function init(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] Client injected')

  const { rpc } = await getDevToolsRpcClient()

  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] RPC', rpc)

  const rpcFunctions = await rpc['vite:core:list-rpc-functions']()
  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] RPC Functions', rpcFunctions)

  const state = useLocalStorage<DockPanelState>(
    'vite-devtools-dock-state',
    {
      width: 80,
      height: 80,
      top: 0,
      left: 0,
      position: 'left',
      open: false,
      minimizePanelInactive: 3_000,
    },
    { mergeDefaults: true },
  )

  const context = await createDockContext(
    'embedded',
    rpc,
    state,
  )

  const { DockEmbedded } = import.meta.env.VITE_DEVTOOLS_LOCAL_DEV
    ? await import('../webcomponents')
    : await import('@vitejs/devtools/client/webcomponents')

  const dockEl = new DockEmbedded({ context })
  document.body.appendChild(dockEl)
}

if (window.parent !== window)
  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] Skipping in iframe')
else
  init()
