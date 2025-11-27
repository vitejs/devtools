import type { DevToolsRpcClientFunctions, DevToolsTerminalSessionBase, DevToolsTerminalSessionStreamChunkEvent } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { Terminal } from '@xterm/xterm'
import type { Reactive } from 'vue'
import { reactive } from 'vue'

export interface TerminalState {
  info: DevToolsTerminalSessionBase
  buffer: string[] | null
  terminal: Terminal | null
}

let _terminalsMap: Reactive<Map<string, TerminalState>> | undefined
export function useTerminals(context: DocksContext): Reactive<Map<string, TerminalState>> {
  if (_terminalsMap) {
    return _terminalsMap
  }
  const map: Reactive<Map<string, TerminalState>> = _terminalsMap = reactive(new Map())
  async function updateTerminals() {
    const terminals = await context.rpc.$call('vite:internal:terminals:list')

    for (const terminal of terminals) {
      if (map.has(terminal.id)) {
        map.get(terminal.id)!.info = Object.freeze(terminal)
        continue
      }
      map.set(terminal.id, {
        info: Object.freeze(terminal),
        buffer: null,
        terminal: null,
      })
    }

    // eslint-disable-next-line no-console
    console.log('[VITE DEVTOOLS] Terminals Updated', [...map.values()])
  }
  context.clientRpc.register({
    name: 'vite:internal:terminals:updated' satisfies keyof DevToolsRpcClientFunctions,
    type: 'action',
    handler: () => updateTerminals(),
  })
  context.clientRpc.register({
    name: 'vite:internal:terminals:stream-chunk' satisfies keyof DevToolsRpcClientFunctions,
    type: 'action',
    handler: (data: DevToolsTerminalSessionStreamChunkEvent) => {
      const terminal = map.get(data.id)
      if (!terminal) {
        console.warn(`[VITE DEVTOOLS] Terminal with id "${data.id}" not found`)
        return
      }
      terminal.buffer?.push(...data.chunks)
      for (const chunk of data.chunks)
        terminal.terminal?.writeln(chunk)
    },
  })
  updateTerminals()

  return map
}
