import type { DevToolsMessageEntry, DevToolsMessagesHost } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export interface MessagesListResult {
  entries: DevToolsMessageEntry[]
  removedIds: string[]
  /** The version cursor — pass back as `since` on next call */
  version: number
}

export const messagesList = defineRpcFunction({
  name: 'devtoolskit:internal:messages:list',
  type: 'static',
  jsonSerializable: true,
  setup: (context) => {
    const host = context.messages as unknown as DevToolsMessagesHost
    return {
      async handler(since?: number | null): Promise<MessagesListResult> {
        const currentVersion = (host as any)._clock as number

        if (since == null) {
          // Full fetch
          return {
            entries: Array.from(host.entries.values()),
            removedIds: [],
            version: currentVersion,
          }
        }

        // Incremental: entries modified since `since`
        const entries: DevToolsMessageEntry[] = []
        for (const [id, entry] of host.entries) {
          const mod = (host as any).lastModified?.get(id) as number | undefined
          if (mod != null && mod > since)
            entries.push(entry)
        }

        // Removals since `since`
        const removedIds: string[] = []
        const removals = (host as any).removals as Array<{ id: string, time: number }>
        for (const r of removals) {
          if (r.time > since)
            removedIds.push(r.id)
        }

        // Prune old removals that all clients have consumed
        // (keep only removals newer than `since` — conservative, but simple)
        const pruneThreshold = since
        while (removals.length > 0 && removals[0]!.time <= pruneThreshold)
          removals.shift()

        return { entries, removedIds, version: currentVersion }
      },
    }
  },
})
