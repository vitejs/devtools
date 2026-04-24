import type { DevtoolDefinition, DevtoolDeploymentKind } from '../types/devtool'

/**
 * Resolve the mount base path for a devtool's SPA. Hosted adapters
 * (`vite`, `kit`, `embedded`) default to `/.<id>/` so they don't
 * collide with the host app; standalone adapters (`cli`, `spa`,
 * `build`) default to `/` because they own the origin.
 *
 * The devtool author can override with `basePath` on the definition.
 */
export function resolveBasePath(def: DevtoolDefinition, kind: DevtoolDeploymentKind): string {
  if (def.basePath)
    return normalizeBasePath(def.basePath)
  return kind === 'standalone' ? '/' : `/.${def.id}/`
}

function normalizeBasePath(base: string): string {
  let out = base.startsWith('/') ? base : `/${base}`
  if (!out.endsWith('/'))
    out = `${out}/`
  return out.replace(/\/+/g, '/')
}
