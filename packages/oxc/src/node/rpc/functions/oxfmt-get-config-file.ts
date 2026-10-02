import { defineOxcRpc } from '../_define'
import { getOxfmtConfig } from '../../utils/oxfmt'

export const oxfmtGetConfigFile = defineOxcRpc({
  name: 'devtools-oxc:get-fmt-config-file',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  setup: context => {
    return {
      handler: async () => {
        const config = await getOxfmtConfig(context.cwd)
        return config
      },
    }
  },
})
