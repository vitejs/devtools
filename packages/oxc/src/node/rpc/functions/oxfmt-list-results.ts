import { defineOxcRpc } from '../_define'
import { listOxfmtCheckResults } from './oxfmt-run'

export const oxfmtListResults = defineOxcRpc({
  name: 'devtools-oxc:list-format-results',
  type: 'query',
  jsonSerializable: true,
  setup: context => ({
    handler: () => listOxfmtCheckResults(context.cwd),
  }),
})
