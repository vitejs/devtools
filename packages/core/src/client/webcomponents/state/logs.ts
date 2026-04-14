import type { DevToolsLogEntry, DevToolsRpcClientFunctions } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { Reactive } from 'vue'
import { reactive } from 'vue'
import { addToast } from './toasts'

export interface LogsState {
  entries: DevToolsLogEntry[]
  unreadCount: number
  pendingSelectId: string | null
}

let _logsState: Reactive<LogsState> | undefined

export function useLogs(context: DocksContext): Reactive<LogsState> {
  if (_logsState)
    return _logsState

  const state: Reactive<LogsState> = _logsState = reactive({
    entries: [],
    unreadCount: 0,
    pendingSelectId: null,
  })

  const entryMap = new Map<string, DevToolsLogEntry>()
  let isInitialFetch = true
  let lastVersion: number | undefined

  async function updateLogs() {
    const result = await context.rpc.call('devtoolskit:internal:logs:list', lastVersion)
    let newCount = 0

    // Apply removals
    for (const id of result.removedIds)
      entryMap.delete(id)

    // Apply new/updated entries
    for (const entry of result.entries) {
      const prev = entryMap.get(entry.id)
      if (!prev) {
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
        addToast(entry)
      }
      entryMap.set(entry.id, entry)
    }

    state.entries = Array.from(entryMap.values())
    state.unreadCount += newCount
    lastVersion = result.version
    isInitialFetch = false
  }

  context.rpc.client.register({
    name: 'devtoolskit:internal:logs:updated' satisfies keyof DevToolsRpcClientFunctions,
    type: 'action',
    handler: () => {
      if (context.rpc.isTrusted)
        updateLogs()
    },
  })

  context.rpc.ensureTrusted().then(() => updateLogs())
  return state
}

export function markLogsAsRead(): void {
  if (_logsState)
    _logsState.unreadCount = 0
}

export function selectLog(id: string): void {
  if (_logsState)
    _logsState.pendingSelectId = id
}
