import { Diagnostic } from 'nostics'
import { diagnostics } from '../../diagnostics'
import { defineOxcRpc } from '../_define'
import { getLintResultsManager } from '../utils'

export const oxlintDeleteResult = defineOxcRpc({
  name: 'devtools-oxc:delete-lint-result',
  type: 'action',
  setup: context => ({
    handler: async ({ resultId }: { resultId: string }) => {
      try {
        await getLintResultsManager(context).delete(resultId)
      } catch (error) {
        if (error instanceof Diagnostic) throw error
        throw diagnostics.OXDT0003({
          resultId,
          reason: error instanceof Error ? error.message : String(error),
          cause: error,
        })
      }
    },
  }),
})
