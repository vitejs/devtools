import type { DevToolsNodeContext } from '../types/context'
import type { DevframeDefinition } from '../types/devframe'

export interface CreateEmbeddedOptions {
  /** Target context the devframe is registered into. Required. */
  ctx: DevToolsNodeContext
}

/**
 * Register a devframe into an already-running devframe/Kit context at
 * runtime. Mirrors what the Vite plugin scan does for devframes passed
 * as plugin options, but exposes the same flow to callers that need
 * dynamic, post-startup registration.
 *
 * The host owns the mount path; when a hosted mount is needed the
 * effective default follows the hosted rule of `def.basePath ?? '/__<id>/'`.
 */
export async function createEmbedded(d: DevframeDefinition, options: CreateEmbeddedOptions): Promise<void> {
  await d.setup(options.ctx)
}
