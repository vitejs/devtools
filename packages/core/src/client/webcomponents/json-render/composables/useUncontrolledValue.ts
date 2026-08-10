import type { Ref } from 'vue'
import type { RegistryComponentProps } from '../components/types'
import { useSessionStorage } from '@vueuse/core'
import { inject } from 'vue'
import { DOCK_ENTRY_ID_KEY } from './dock-entry-id'

/**
 * Session-persisted fallback for a json-render element's own *uncontrolled*
 * value — the local state a `Tabs`/`Select`/`TextInput`/`Switch` falls back
 * to while its `value` prop has no `$bindState` binding. Never touches a
 * genuinely controlled (bound) value — callers keep using `useBoundProp` for
 * that side and only read from this composable when unbound, exactly as
 * `Tabs.ts` already split `controlled`/`uncontrolledValue` before this existed.
 *
 * Persistence is on by default (not opt-in per element) — just calling this
 * instead of a plain `ref(default)` gets you a value that survives a reload
 * within the same tab.
 *
 * ### Stable key
 * `UIElement` (what registry components actually receive) carries no id of
 * its own — identity lives on the sibling `FlatElement.key`, which
 * `@json-render/vue`'s `ElementRenderer` does not forward into the
 * component's props (it's only used internally for Vue's own `:key` and a
 * devtools-only debug attribute). Absent that, this derives a stable-enough
 * key from the current dock's id (`provide`d by `ViewJsonRender.vue`, read
 * via {@link DOCK_ENTRY_ID_KEY}) plus a signature of the element's own static
 * shape — its `props` minus the bound prop itself (e.g. `Tabs`' own `tabs`
 * list, `Select`'s own `options`). If that shape changes, the derived key
 * changes with it and persistence naturally falls back to `defaultValue`
 * instead of restoring a stale value for a different element — that's
 * intended, not a bug to fix.
 */
export function useUncontrolledValue<Type extends string, Props extends Record<string, any>, Prop extends keyof Props>(
  ctx: RegistryComponentProps<Type, Props>,
  prop: Prop,
  defaultValue: Props[Prop],
): Ref<Props[Prop]> {
  const dockEntryId = inject(DOCK_ENTRY_ID_KEY, undefined)

  const staticShape: Record<string, unknown> = { ...ctx.element.props }
  delete staticShape[prop as string]

  const key = `vite-devtools-uncontrolled:${dockEntryId ?? '~'}:${ctx.element.type}:${JSON.stringify(staticShape)}`
  return useSessionStorage<Props[Prop]>(key, defaultValue)
}
