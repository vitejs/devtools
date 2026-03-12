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

  const prevEntryMap = new Map<string, DevToolsLogEntry>()
  let isInitialFetch = true

  async function updateLogs() {
    const logs = await context.rpc.call('devtoolskit:internal:logs:list')
    let newCount = 0

    for (const entry of logs) {
      const prev = prevEntryMap.get(entry.id)
      if (!prev) {
        // New entry
        newCount++
        if (isInitialFetch) {
          // On initial fetch (page refresh), only toast entries still loading
          if (entry.notify && entry.status === 'loading')
            addToast(entry)
        }
        else {
          if (entry.notify)
            addToast(entry)
        }
      }
      else if (entry.notify && JSON.stringify(entry) !== JSON.stringify(prev)) {
        // Updated entry with notify flag — update the toast
        addToast(entry)
      }
    }

    state.entries = logs
    state.unreadCount += newCount
    isInitialFetch = false

    prevEntryMap.clear()
    for (const entry of logs)
      prevEntryMap.set(entry.id, entry)
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
