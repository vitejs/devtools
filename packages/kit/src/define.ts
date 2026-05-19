import type { WhenContext, WhenExpression } from 'devframe/utils/when'
import type { DevToolsDockUserEntry, DevToolsServerCommandInput, JsonRenderSpec, ViteDevToolsNodeContext } from './types'
import { createDefineWrapperWithContext } from 'devframe/rpc'

export const defineRpcFunction = createDefineWrapperWithContext<ViteDevToolsNodeContext>()

export function defineCommand<const W extends string = ''>(
  command: Omit<DevToolsServerCommandInput, 'when'> & { when?: WhenExpression<WhenContext, W> },
): DevToolsServerCommandInput {
  return command as DevToolsServerCommandInput
}

export function defineDockEntry<
  const T extends DevToolsDockUserEntry,
  const W extends string = '',
>(
  entry: Omit<T, 'when'> & { when?: WhenExpression<WhenContext, W> },
): T {
  return entry as unknown as T
}

export function defineJsonRenderSpec(spec: JsonRenderSpec): JsonRenderSpec {
  return spec
}
