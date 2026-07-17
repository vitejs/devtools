import type { DevframeNodeContext } from 'devframe/types'
import { defineOxcRpc } from '../_define'

const enabledContexts = new WeakSet<DevframeNodeContext>()

export function enableOxlintRun(context: DevframeNodeContext) {
  enabledContexts.add(context)
}

export const oxlintCapabilities = defineOxcRpc({
  name: 'devtools-oxc:lint-capabilities',
  type: 'query',
  jsonSerializable: true,
  setup: context => ({
    handler: () => ({ canRun: enabledContexts.has(context) }),
  }),
})
