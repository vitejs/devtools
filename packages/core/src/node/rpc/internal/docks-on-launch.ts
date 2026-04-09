import { defineRpcFunction } from '@vitejs/devtools-kit'
import { logger } from '../../diagnostics'

export const docksOnLaunch = defineRpcFunction({
  name: 'devtoolskit:internal:docks:on-launch',
  type: 'action',
  setup: (context) => {
    const launchMap = new Map<string, Promise<void>>()
    return {
      handler: async (entryId: string) => {
        if (launchMap.has(entryId)) {
          return launchMap.get(entryId)!
        }

        const entry = context.docks.values().find(entry => entry.id === entryId)
        if (!entry) {
          throw logger.DTK0030({ id: entryId }).throw()
        }
        if (entry.type !== 'launcher') {
          throw logger.DTK0031({ id: entryId }).throw()
        }
        try {
          context.docks.update({
            ...entry,
            launcher: {
              ...entry.launcher,
              status: 'loading',
            },
          })
          const promise = entry.launcher.onLaunch()
          launchMap.set(entryId, promise)
          const result = await promise
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
          logger.DTK0032({ id: entryId }, { cause: error }).log()
          context.docks.update({
            ...entry,
            launcher: {
              ...entry.launcher,
              status: 'error',
              error: error instanceof Error ? error.message : String(error),
            },
          })
        }
      },
    }
  },
})
