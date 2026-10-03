import { defineOxcRpc } from '../_define'
import { listOxfmtFormatResults } from './oxfmt-run'

export const oxfmtListResults = defineOxcRpc({
  name: 'devtools-oxc:list-format-results',
  type: 'query',
  jsonSerializable: true,
  setup: context => ({
    handler: () => listOxfmtFormatResults(context.cwd),
  }),
})
