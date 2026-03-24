import type { DevToolsNodeContext, DevToolsServerCommandInput, JsonRenderSpec } from './types'
import { createDefineWrapperWithContext } from '@vitejs/devtools-rpc'

export const defineRpcFunction = createDefineWrapperWithContext<DevToolsNodeContext>()

export function defineCommand(command: DevToolsServerCommandInput): DevToolsServerCommandInput {
  return command
}

export function defineJsonRenderSpec(spec: JsonRenderSpec): JsonRenderSpec {
  return spec
}
