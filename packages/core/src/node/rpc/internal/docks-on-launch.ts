import { defineRpcFunction } from '@vitejs/devtools-kit'
import { diagnostics } from '../../diagnostics'

export const docksOnLaunch = defineRpcFunction({
  name: 'devtoolskit:internal:docks:on-launch',
  type: 'action',
  setup: (context) => {
    const launchMap = new Map<string, Promise<unknown>>()
    return {
      handler: async (entryId: string) => {
        // De-dupe concurrent launches of the same entry, but only while one is
        // in flight — the entry is removed once it settles so a later click
        // (e.g. Retry after a failure) starts a fresh launch.
        if (launchMap.has(entryId)) {
          return launchMap.get(entryId)!
        }

        const entry = context.docks.values().find(entry => entry.id === entryId)
        if (!entry) {
          throw diagnostics.DTK0030({ id: entryId })
        }
        if (entry.type !== 'launcher') {
          throw diagnostics.DTK0031({ id: entryId })
        }

        const run = (async () => {
          try {
            context.docks.update({
              ...entry,
              launcher: {
                ...entry.launcher,
                status: 'loading',
                error: undefined,
              },
            })
            // devframe ≥0.7.4 made `onLaunch` optional in favour of a bound
            // `command` (the serializable launch path). Prefer the in-process
            // handler; fall back to executing the command.
            const { onLaunch, command } = entry.launcher
            const result = onLaunch
              ? await onLaunch()
              : command
                ? await context.commands.execute(command)
                : undefined
            // The launch may have replaced the entry (e.g. swapped to an
            // iframe); only stamp success while it is still a launcher.
            const newEntry = context.docks.values().find(entry => entry.id === entryId) || entry
            if (newEntry.type === 'launcher') {
              context.docks.update({
                ...newEntry,
                launcher: {
                  ...newEntry.launcher,
                  status: 'success',
                },
              })
            }
            return result
          }
          catch (error) {
            diagnostics.DTK0032({ id: entryId, cause: error })
            const newEntry = context.docks.values().find(entry => entry.id === entryId) || entry
            if (newEntry.type === 'launcher') {
              context.docks.update({
                ...newEntry,
                launcher: {
                  ...newEntry.launcher,
                  status: 'error',
                  error: error instanceof Error ? error.message : String(error),
                },
              })
            }
          }
        })()

        launchMap.set(entryId, run)
        try {
          return await run
        }
        finally {
          launchMap.delete(entryId)
        }
      },
    }
  },
})
