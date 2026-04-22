import type { DevToolsNodeContext, DevToolsServerCommandInput, JsonRenderSpec } from 'takubox/types'
import { createDefineWrapperWithContext } from 'takubox/rpc'

export const defineRpcFunction = createDefineWrapperWithContext<DevToolsNodeContext>()

export function defineCommand(command: DevToolsServerCommandInput): DevToolsServerCommandInput {
  return command
}

export function defineJsonRenderSpec(spec: JsonRenderSpec): JsonRenderSpec {
  return spec
}
