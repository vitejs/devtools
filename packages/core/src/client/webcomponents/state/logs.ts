import type { DevToolsLogEntry, DevToolsRpcClientFunctions } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { Reactive } from 'vue'
import { reactive } from 'vue'
import { addToast } from './toasts'

export interface LogsState {
  entries: DevToolsLogEntry[]
  unreadCount: number
}

let _logsState: Reactive<LogsState> | undefined

export function useLogs(context: DocksContext): Reactive<LogsState> {
  if (_logsState)
    return _logsState

  const state: Reactive<LogsState> = _logsState = reactive({
    entries: [],
    unreadCount: 0,
  })

  async function updateLogs() {
    const logs = await context.rpc.call('devtoolskit:internal:logs:list')
    const prevCount = state.entries.length
    state.entries = logs
    const newCount = Math.max(0, logs.length - prevCount)
    state.unreadCount += newCount

    // Show toast notifications for new entries with notify flag
    if (newCount > 0) {
      const newEntries = logs.slice(logs.length - newCount)
      for (const entry of newEntries) {
        if (entry.notify)
          addToast(entry)
      }
    }
  }

  context.rpc.client.register({
    name: 'devtoolskit:internal:logs:updated' satisfies keyof DevToolsRpcClientFunctions,
    type: 'action',
    handler: () => updateLogs(),
  })

  updateLogs()
  return state
}

export function markLogsAsRead(): void {
  if (_logsState)
    _logsState.unreadCount = 0
}
