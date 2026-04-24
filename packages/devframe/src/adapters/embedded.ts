import type { DevToolsNodeContext } from '../types/context'
import type { DevtoolDefinition } from '../types/devtool'

export interface CreateEmbeddedOptions {
  /** Target context the devtool is registered into. Required. */
  ctx: DevToolsNodeContext
}

/**
 * Register a devtool into an already-running devframe/Kit context at
 * runtime. Mirrors what the Vite plugin scan does for devtools passed
 * as plugin options, but exposes the same flow to callers that need
 * dynamic, post-startup registration.
 */
export async function createEmbedded(d: DevtoolDefinition, options: CreateEmbeddedOptions): Promise<void> {
  await d.setup(options.ctx)
}
