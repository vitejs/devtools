import type { DevToolsNodeContext, DevToolsServerCommandInput, JsonRenderSpec } from 'devframe/types'
import { createDefineWrapperWithContext } from 'devframe/rpc'

export const defineRpcFunction = createDefineWrapperWithContext<DevToolsNodeContext>()

export function defineCommand(command: DevToolsServerCommandInput): DevToolsServerCommandInput {
  return command
}

export function defineJsonRenderSpec(spec: JsonRenderSpec): JsonRenderSpec {
  return spec
}
