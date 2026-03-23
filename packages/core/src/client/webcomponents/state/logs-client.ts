import type { DevToolsLogEntry, DevToolsLogEntryInput, DevToolsLogHandle, DevToolsLogsClient } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'

function createRpcHandle(rpc: DevToolsRpcClient, initialEntry: DevToolsLogEntry): DevToolsLogHandle {
  let entry = initialEntry
  return {
    get entry() { return entry },
    get id() { return entry.id },
    async update(patch: Partial<DevToolsLogEntryInput>) {
      const updated = await rpc.call('devtoolskit:internal:logs:update', entry.id, patch)
      if (updated)
        entry = updated
      return updated ?? undefined
    },
    async dismiss() {
      await rpc.call('devtoolskit:internal:logs:remove', entry.id)
    },
  }
}

export function createClientLogsClient(rpc: DevToolsRpcClient): DevToolsLogsClient {
  const buffer: (() => Promise<void>)[] = []
  let flushing = false

  async function flush() {
    if (flushing)
      return
    flushing = true
    while (buffer.length > 0) {
      const op = buffer.shift()!
      await op()
    }
    flushing = false
  }

  function enqueue(op: () => Promise<void>): Promise<void> {
    if (rpc.isTrusted === true && buffer.length === 0)
      return op()
    return new Promise<void>((resolve) => {
      buffer.push(async () => {
        await op()
        resolve()
      })
    })
  }

  rpc.events.on('rpc:is-trusted:updated', (isTrusted) => {
    if (isTrusted && buffer.length > 0)
      flush()
  })

  return {
    async add(input: DevToolsLogEntryInput): Promise<DevToolsLogHandle> {
      if (rpc.isTrusted === true && buffer.length === 0) {
        const entry = await rpc.call('devtoolskit:internal:logs:add', input)
        return createRpcHandle(rpc, entry)
      }

      // Deferred handle: resolves once the buffered add flushes
      let resolved: DevToolsLogHandle | undefined
      const ready = new Promise<DevToolsLogHandle>(resolve => buffer.push(async () => {
        const entry = await rpc.call('devtoolskit:internal:logs:add', input)
        resolved = createRpcHandle(rpc, entry)
        resolve(resolved)
      }))

      const placeholder: DevToolsLogEntry = {
        ...input,
        id: input.id ?? `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        from: 'browser',
        timestamp: input.timestamp ?? Date.now(),
      }

      return {
        get entry() { return resolved?.entry ?? placeholder },
        get id() { return resolved?.id ?? placeholder.id },
        update: patch => resolved ? resolved.update(patch) : ready.then(h => h.update(patch)),
        dismiss: () => resolved ? resolved.dismiss() : ready.then(h => h.dismiss()),
      }
    },

    remove(id: string): Promise<void> {
      return enqueue(() => rpc.call('devtoolskit:internal:logs:remove', id))
    },

    clear(): Promise<void> {
      if (rpc.isTrusted === true && buffer.length === 0)
        return rpc.call('devtoolskit:internal:logs:clear')
      // Discard preceding buffered operations — they'd be cleared anyway
      buffer.length = 0
      return enqueue(() => rpc.call('devtoolskit:internal:logs:clear'))
    },
  }
}
