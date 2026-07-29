import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type {
  DevToolsClientContext,
  DockRenderer,
  DockRenderersContext,
  DocksContext,
} from '@vitejs/devtools-kit/client'

/**
 * The client-side dock-renderer registry required by the hub's `DocksContext`
 * (devframe 0.7.6). The headless hub routes a dock `type` to a host-registered
 * renderer through this registry — e.g. a host could register
 * `@devframes/json-render-ui` for `'json-render'`.
 *
 * Vite DevTools renders its built-in dock types directly in `ViewEntry.vue`
 * (it owns its Vue shell rather than delegating to the hub's client host), so
 * nothing is registered here by default. The registry still exists so the
 * context satisfies the hub contract and third-party dock types can plug in.
 */
export function createDockRenderers(getContext: () => DocksContext): DockRenderersContext {
  const renderers = new Map<string, DockRenderer>()

  return {
    register(type, renderer) {
      renderers.set(type, renderer)
      return () => {
        if (renderers.get(type) === renderer)
          renderers.delete(type)
      }
    },
    get(type) {
      return renderers.get(type)
    },
    has(type) {
      return renderers.has(type)
    },
    async mount(entry: DevToolsDockEntry, container: HTMLElement) {
      const renderer = renderers.get(entry.type)
      if (!renderer) {
        console.warn(`[vite-devtools] no dock renderer registered for type "${entry.type}"`)
        return () => {}
      }
      const instance = await renderer({
        entry,
        container,
        context: getContext() as DevToolsClientContext,
      })
      return () => instance.dispose?.()
    },
  }
}
