import type { ViteDevToolsNodeContext } from './types'
import { createDefineWrapperWithContext } from 'devframe/rpc'

export { defineCommand, defineDockEntry } from '@devframes/hub'

export const defineRpcFunction = createDefineWrapperWithContext<ViteDevToolsNodeContext>()
