import type { KitNodeContext } from '@vitejs/devtools-kit/node'

/**
 * Keep a dock entry out of the dock bar while its backing collection is empty.
 *
 * Mirrors the hub's built-in `~terminals` / `~messages` docks: attaches a live
 * `when` getter to the registered entry that resolves to `'false'`
 * (unconditionally hidden) while `isEmpty()` and `undefined` (visible)
 * otherwise. The hub already re-serializes the dock shared state on every
 * terminal / message change, so the getter is re-read at exactly the right
 * moments — no explicit event subscription needed here.
 *
 * Call this from the `setup(ctx)` hook of the `createPluginFromDevframe` mount,
 * after the auto-derived dock entry has been registered.
 *
 * TODO: once devframe/hub ships first-class support for a functional `when`
 * (`when?: () => string | boolean | undefined`, resolved during dock
 * serialization), this can become a plain `dock: { when: () => ... }` option
 * on `createPluginFromDevframe` and the getter trick can be deleted.
 */
export function hideDockWhenEmpty(
  ctx: KitNodeContext,
  dockId: string,
  isEmpty: () => boolean,
): void {
  const view = ctx.docks.views.get(dockId)
  if (!view)
    return
  Object.defineProperty(view, 'when', {
    enumerable: true,
    configurable: true,
    get: () => (isEmpty() ? 'false' : undefined),
  })
}
