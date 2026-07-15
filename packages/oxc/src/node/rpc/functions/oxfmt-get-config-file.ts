import { defineOxcRpc } from '../_define'
import { getOxfmtConfig } from '../../utils/oxfmt'

export const oxfmtGetConfigFile = defineOxcRpc({
  name: 'devtools-oxc:get-fmt-config-file',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  setup: () => {
    return {
      handler: async () => {
        const config = await getOxfmtConfig()
        return config
      },
    }
  },
})
