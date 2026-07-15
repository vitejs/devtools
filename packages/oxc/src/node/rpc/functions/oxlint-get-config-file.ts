import { defineOxcRpc } from '../_define'
import { getOxlintConfig } from '../../utils/oxlint'

export const oxlintGetConfigFile = defineOxcRpc({
  name: 'devtools-oxc:get-lint-config-file',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  setup: () => {
    return {
      handler: async () => {
        const config = await getOxlintConfig()
        return config
      },
    }
  },
})
