import type { DevToolsNodeContext } from '../types'
import { createDefineWrapperWithContext } from '@vitejs/devtools-rpc'

export const defineRpcFunction = createDefineWrapperWithContext<DevToolsNodeContext>()
