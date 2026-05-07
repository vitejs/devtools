import type { DevToolsMessageEntry, DevToolsRpcClientFunctions } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { Reactive } from 'vue'
import { reactive } from 'vue'
import { addToast } from './toasts'

export interface MessagesState {
  entries: DevToolsMessageEntry[]
  unreadCount: number
  pendingSelectId: string | null
}

let _messagesState: Reactive<MessagesState> | undefined

export function useMessages(context: DocksContext): Reactive<MessagesState> {
  if (_messagesState)
    return _messagesState

  const state: Reactive<MessagesState> = _messagesState = reactive({
    entries: [],
    unreadCount: 0,
    pendingSelectId: null,
  })

  const entryMap = new Map<string, DevToolsMessageEntry>()
  let isInitialFetch = true
  let lastVersion: number | undefined

  async function updateMessages() {
    const result = await context.rpc.call('devtoolskit:internal:messages:list', lastVersion)
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
    name: 'devframe:messages:updated' satisfies keyof DevToolsRpcClientFunctions,
    type: 'action',
    handler: () => {
      if (context.rpc.isTrusted)
        updateMessages()
    },
  })

  context.rpc.ensureTrusted().then(() => updateMessages())
  return state
}

export function markMessagesAsRead(): void {
  if (_messagesState)
    _messagesState.unreadCount = 0
}

export function selectMessage(id: string): void {
  if (_messagesState)
    _messagesState.pendingSelectId = id
}
