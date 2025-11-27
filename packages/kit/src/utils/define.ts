import type { DevToolsNodeContext } from '../types'
import { createDefineWrapperWithContext } from 'birpc-x'

export const defineRpcFunction = createDefineWrapperWithContext<DevToolsNodeContext>()
