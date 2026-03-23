import type { DevToolsNodeContext, DevToolsServerCommandInput } from '../types'
import { createDefineWrapperWithContext } from '@vitejs/devtools-rpc'

export const defineRpcFunction = createDefineWrapperWithContext<DevToolsNodeContext>()

export function defineCommand(command: DevToolsServerCommandInput): DevToolsServerCommandInput {
  return command
}
