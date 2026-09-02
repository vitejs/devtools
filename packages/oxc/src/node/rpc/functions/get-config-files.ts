import { getOxcConfigFiles } from '../../utils/config-files'
import { defineOxcRpc } from '../_define'

export const getConfigFiles = defineOxcRpc({
  name: 'devtools-oxc:get-config-files',
  type: 'query',
  jsonSerializable: true,
  setup: ctx => ({
    handler: () => getOxcConfigFiles(ctx.cwd),
  }),
})
