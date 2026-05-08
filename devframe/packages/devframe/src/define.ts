import type { DevToolsNodeContext, JsonRenderSpec } from 'devframe/types'
import { createDefineWrapperWithContext } from 'devframe/rpc'

export const defineRpcFunction = createDefineWrapperWithContext<DevToolsNodeContext>()

export function defineJsonRenderSpec(spec: JsonRenderSpec): JsonRenderSpec {
  return spec
}
