import type { DockRendererRegistration } from '@vitejs/devtools-kit'
import { jsonRenderUiRenderer } from '@devframes/json-render-ui/hub'

/** Merge configured renderers over the built-ins while keeping one entry per type. */
export function resolveDockRendererRegistrations(
  configuredRenderers: readonly DockRendererRegistration[] = [],
): DockRendererRegistration[] {
  const renderersByType = new Map<string, DockRendererRegistration>()
  const registrations = [jsonRenderUiRenderer(), ...configuredRenderers]
  for (const registration of registrations)
    renderersByType.set(registration.type, registration)
  return [...renderersByType.values()]
}
