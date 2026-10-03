import { defineOxcRpc } from '../_define'
import { getLintResultsManager } from '../utils'

export const oxlintGetResult = defineOxcRpc({
  name: 'devtools-oxc:get-lint-result',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  setup: context => ({
    handler: ({ resultId }: { resultId: string }) => getLintResultsManager(context).load(resultId),
  }),
})
