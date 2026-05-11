import type { DevToolsNodeContext } from 'devframe/types'
import { createDefineWrapperWithContext } from 'devframe/rpc'

export const defineRpcFunction = createDefineWrapperWithContext<DevToolsNodeContext>()
