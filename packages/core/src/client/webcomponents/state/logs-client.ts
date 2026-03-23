import type { DevToolsLogEntryInput, DevToolsLogHandle, DevToolsLogsClient } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'

export function createClientLogsClient(rpc: DevToolsRpcClient): DevToolsLogsClient {
  const buffer: (() => Promise<void>)[] = []
  let flushing: Promise<void> | undefined

  async function flush() {
    if (rpc.isTrusted !== true)
      return
    if (flushing === undefined) {
      // eslint-disable-next-line no-async-promise-executor
      flushing = new Promise(async (resolve) => {
        while (buffer.length > 0) {
          const op = buffer.shift()!
          await op()
        }
        resolve()
      })
    }
    return flushing
  }

  async function enqueue<T>(op: () => Promise<T>): Promise<T> {
    if (rpc.isTrusted === true && buffer.length !== 0)
      await flush()

    if (rpc.isTrusted === true && buffer.length === 0)
      return await op()

    return new Promise<T>((resolve) => {
      buffer.push(async () => {
        const result = await op()
        resolve(result)
      })
    })
  }

  rpc.events.on('rpc:is-trusted:updated', (isTrusted) => {
    if (isTrusted && buffer.length > 0)
      flush()
  })

  return {
    add(input: DevToolsLogEntryInput): Promise<DevToolsLogHandle> {
      return enqueue(async () => {
        let entry = await rpc.call('devtoolskit:internal:logs:add', input)
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
      })
    },
    remove(id: string): Promise<void> {
      return enqueue(() => rpc.call('devtoolskit:internal:logs:remove', id))
    },
    clear(): Promise<void> {
      return enqueue(() => rpc.call('devtoolskit:internal:logs:clear'))
    },
  }
}
