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
  return {
    async add(input: DevToolsLogEntryInput): Promise<DevToolsLogHandle> {
      const entry = await rpc.call('devtoolskit:internal:logs:add', input)
      return createRpcHandle(rpc, entry)
    },
    async remove(id: string): Promise<void> {
      await rpc.call('devtoolskit:internal:logs:remove', id)
    },
    async clear(): Promise<void> {
      await rpc.call('devtoolskit:internal:logs:clear')
    },
  }
}
