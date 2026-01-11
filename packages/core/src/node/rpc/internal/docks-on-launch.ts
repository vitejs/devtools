import { defineRpcFunction } from '@vitejs/devtools-kit'
import * as v from 'valibot'

export const docksOnLaunch = defineRpcFunction({
  name: 'vite:internal:docks:on-launch',
  type: 'action',
  args: v.string(),
  returns: v.void(),
  setup: (context) => {
    const launchMap = new Map<string, Promise<void>>()
    return {
      handler: async (entryId: string) => {
        if (launchMap.has(entryId)) {
          return launchMap.get(entryId)!
        }

        const entry = context.docks.values().find(entry => entry.id === entryId)
        if (!entry) {
          throw new Error(`Dock entry with id "${entryId}" not found`)
        }
        if (entry.type !== 'launcher') {
          throw new Error(`Dock entry with id "${entryId}" is not a launcher`)
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
          console.error(`[VITE DEVTOOLS] Error launching dock entry "${entryId}"`, error)
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
