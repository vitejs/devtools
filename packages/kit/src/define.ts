import type { JsonRenderSpec, ViteDevToolsNodeContext } from './types'
import { createDefineWrapperWithContext } from 'devframe/rpc'

export { defineCommand, defineDockEntry } from '@devframes/hub'

/**
 * Identity helper that types a json-render spec literal. `@devframes/hub` no
 * longer ships this (json-render moved to the opt-in `@devframes/json-render`
 * package, whose spec is a plain `@json-render/core` `Spec`), so the kit keeps
 * the convenience helper for authoring specs with inference.
 */
export function defineJsonRenderSpec(spec: JsonRenderSpec): JsonRenderSpec {
  return spec
}

export const defineRpcFunction = createDefineWrapperWithContext<ViteDevToolsNodeContext>()
