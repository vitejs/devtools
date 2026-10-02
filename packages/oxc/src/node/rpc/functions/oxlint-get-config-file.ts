import { defineOxcRpc } from '../_define'
import { getOxlintConfig } from '../../utils/oxlint'

export const oxlintGetConfigFile = defineOxcRpc({
  name: 'devtools-oxc:get-lint-config-file',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  setup: context => {
    return {
      handler: async () => {
        const config = await getOxlintConfig(context.cwd)
        return config
      },
    }
  },
})
