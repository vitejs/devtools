import type { DevToolsRpcClientFunctions } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { Ref, ShallowRef } from 'vue'
import type { DevToolsTerminalSessionBase } from '../../../../../kit/src'
import { shallowRef } from 'vue'

export interface TerminalState {
  info: DevToolsTerminalSessionBase
  buffer?: string[] | null
}

let _terminalsRef: ShallowRef<TerminalState[]> | undefined
export async function useTerminals(context: DocksContext): Promise<Ref<TerminalState[]>> {
  if (_terminalsRef) {
    return _terminalsRef
  }
  const terminals = _terminalsRef = shallowRef<TerminalState[]>([])
  async function udpateTerminals() {
    terminals.value = (await context.rpc.$call('vite:internal:terminals:list'))
      .map((info) => {
        return {
          info: Object.freeze(info),
          buffer: null,
        }
      })
    // eslint-disable-next-line no-console
    console.log('[VITE DEVTOOLS] Terminals Updated', [...terminals.value])
  }
  context.clientRpc.register({
    name: 'vite:internal:terminals:updated' satisfies keyof DevToolsRpcClientFunctions,
    type: 'action',
    handler: () => udpateTerminals(),
  })
  await udpateTerminals()
  return terminals
}
