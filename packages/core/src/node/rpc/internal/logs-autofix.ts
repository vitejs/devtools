import { defineRpcFunction } from '@vitejs/devtools-kit'

export const logsAutofix = defineRpcFunction({
  name: 'devtoolskit:internal:logs:autofix',
  type: 'action',
  setup: (context) => {
    return {
      async handler(logId: string): Promise<void> {
        const entry = context.logs.entries.get(logId)
        if (!entry)
          throw new Error(`Log entry with id "${logId}" not found`)
        if (!entry.autofix)
          throw new Error(`Log entry "${logId}" has no autofix action`)

        if (typeof entry.autofix === 'function') {
          await entry.autofix()
        }
        else if (entry.autofix.type === 'rpc') {
          await context.rpc.invokeLocal(entry.autofix.name as any)
        }
      },
    }
  },
})
