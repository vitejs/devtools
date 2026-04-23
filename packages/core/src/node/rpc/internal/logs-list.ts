import type { DevToolsLogEntry } from '@vitejs/devtools-kit'
import type { DevToolsLogsHost } from 'devframe/node'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export interface LogsListResult {
  entries: DevToolsLogEntry[]
  removedIds: string[]
  /** The version cursor — pass back as `since` on next call */
  version: number
}

export const logsList = defineRpcFunction({
  name: 'devtoolskit:internal:logs:list',
  type: 'static',
  setup: (context) => {
    const host = context.logs as unknown as DevToolsLogsHost

    return {
      async handler(since?: number): Promise<LogsListResult> {
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
        const entries: DevToolsLogEntry[] = []
        for (const [id, entry] of host.entries) {
          const mod = host.lastModified.get(id)
          if (mod != null && mod > since)
            entries.push(entry)
        }

        // Removals since `since`
        const removedIds: string[] = []
        for (const r of host.removals) {
          if (r.time > since)
            removedIds.push(r.id)
        }

        // Prune old removals that all clients have consumed
        // (keep only removals newer than `since` — conservative, but simple)
        const pruneThreshold = since
        while (host.removals.length > 0 && host.removals[0]!.time <= pruneThreshold)
          host.removals.shift()

        return { entries, removedIds, version: currentVersion }
      },
    }
  },
})
