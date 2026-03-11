import type { DevToolsLogEntry } from '@vitejs/devtools-kit'
import type { Reactive } from 'vue'
import { reactive } from 'vue'

export interface ToastItem {
  id: string
  entry: DevToolsLogEntry
}

const toasts: Reactive<ToastItem[]> = reactive([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function useToasts(): Reactive<ToastItem[]> {
  return toasts
}

export function addToast(entry: DevToolsLogEntry): void {
  // Dedup: update existing toast with same id
  const existing = toasts.find(t => t.id === entry.id)
  if (existing) {
    existing.entry = entry
    // Reset auto-dismiss timer
    const timer = timers.get(entry.id)
    if (timer)
      clearTimeout(timer)
    const timeout = entry.autoDismiss ?? 5000
    timers.set(entry.id, setTimeout(dismissToast, timeout, entry.id))
    return
  }

  const item: ToastItem = { id: entry.id, entry }
  toasts.push(item)

  const timeout = entry.autoDismiss ?? 5000
  timers.set(entry.id, setTimeout(dismissToast, timeout, entry.id))
}

export function dismissToast(id: string): void {
  const idx = toasts.findIndex(t => t.id === id)
  if (idx !== -1)
    toasts.splice(idx, 1)
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}
