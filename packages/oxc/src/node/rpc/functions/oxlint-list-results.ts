import { defineOxcRpc } from '../_define'
import { getLintResultsManager } from '../utils'

export const oxlintListResults = defineOxcRpc({
  name: 'devtools-oxc:list-lint-results',
  type: 'query',
  jsonSerializable: true,
  setup: context => ({
    handler: () => getLintResultsManager(context).list(),
  }),
})
