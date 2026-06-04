import type { DevToolsRpcClientFunctions, DevToolsTerminalSessionBase } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { Terminal } from '@xterm/xterm'
import type { Reactive } from 'vue'
import { reactive } from 'vue'

const TERMINAL_STREAM_CHANNEL = 'devframe:terminals'

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
  const subscribed = new Set<string>()

  function subscribeToStream(id: string): void {
    if (subscribed.has(id))
      return
    subscribed.add(id)
    const reader = context.rpc.streaming.subscribe<string>(TERMINAL_STREAM_CHANNEL, id)
    ;(async () => {
      try {
        for await (const chunk of reader) {
          const terminal = map.get(id)
          if (!terminal)
            continue
          terminal.buffer?.push(chunk)
          terminal.terminal?.writeln(chunk)
        }
      }
      catch (err) {
        console.warn(`[VITE DEVTOOLS] Terminal stream "${id}" ended with error:`, err)
      }
    })()
  }

  async function updateTerminals() {
    const terminals = await context.rpc.call('devtoolskit:internal:terminals:list')

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
      subscribeToStream(terminal.id)
    }

    // eslint-disable-next-line no-console
    console.log('[VITE DEVTOOLS] Terminals Updated', [...map.values()])
  }
  context.rpc.client.register({
    name: 'devframe:terminals:updated' satisfies keyof DevToolsRpcClientFunctions,
    type: 'action',
    handler: () => updateTerminals(),
  })
  updateTerminals()

  return map
}
