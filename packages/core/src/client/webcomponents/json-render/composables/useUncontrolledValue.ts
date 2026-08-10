import type { Ref } from 'vue'
import type { RegistryComponentProps } from '../components/types'
import { useSessionStorage } from '@vueuse/core'
import { inject } from 'vue'
import { DOCK_ENTRY_ID_KEY } from './dock-entry-id'

/**
 * Session-persisted fallback for a json-render element's own *uncontrolled*
 * value — the local state `Tabs`/`Select`/`TextInput`/`Switch` fall back to
 * when `value` has no `$bindState` binding. On by default: calling this
 * instead of a plain `ref(default)` survives a reload within the same tab.
 *
 * The key is derived rather than passed in, since `UIElement` carries no id
 * of its own: it combines the current dock's id ({@link DOCK_ENTRY_ID_KEY})
 * with a signature of the element's own static props (minus the bound prop).
 * A shape change yields a different key, so persistence falls back to
 * `defaultValue` instead of restoring a stale value for a different element —
 * intended, not a bug.
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
