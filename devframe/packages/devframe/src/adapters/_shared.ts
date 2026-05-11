import type { DevframeDefinition, DevframeDeploymentKind } from '../types/devframe'

/**
 * Resolve the mount base path for a devframe's SPA. Hosted adapters
 * (`vite`, `kit`, `embedded`) default to `/__<id>/` so they don't
 * collide with the host app; standalone adapters (`cli`, `spa`,
 * `build`) default to `/` because they own the origin.
 *
 * The devframe author can override with `basePath` on the definition.
 */
export function resolveBasePath(def: DevframeDefinition, kind: DevframeDeploymentKind): string {
  if (def.basePath)
    return normalizeBasePath(def.basePath)
  return kind === 'standalone' ? '/' : `/__${def.id}/`
}

export function normalizeBasePath(base: string): string {
  let out = base.startsWith('/') ? base : `/${base}`
  if (!out.endsWith('/'))
    out = `${out}/`
  return out.replace(/\/+/g, '/')
}
