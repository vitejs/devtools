import { rm } from 'node:fs/promises'
import { Diagnostic } from 'nostics'
import { resolve } from 'pathe'
import { diagnostics } from '../../diagnostics'
import { defineOxcRpc } from '../_define'

export const oxfmtDeleteResult = defineOxcRpc({
  name: 'devtools-oxc:delete-format-result',
  type: 'action',
  setup: context => ({
    handler: async ({ resultId }: { resultId: string }) => {
      try {
        if (typeof resultId !== 'string' || !/^\d+$/.test(resultId)) {
          throw diagnostics.OXDT0008({ resultId, reason: 'Invalid format result ID.' })
        }
        await rm(resolve(context.cwd, '.devtools-oxc', 'fmt', resultId), { recursive: true })
      } catch (error) {
        if (error instanceof Diagnostic) throw error
        throw diagnostics.OXDT0008({
          resultId,
          reason: error instanceof Error ? error.message : String(error),
          cause: error,
        })
      }
    },
  }),
})
