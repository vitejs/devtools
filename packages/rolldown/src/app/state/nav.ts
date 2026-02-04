import type { MaybeRefOrGetter } from 'vue'
import { computed, onScopeDispose, reactive, toRef, watch } from 'vue'

export interface SideNavItem {
  icon: string
  title: string
  category?: string
  to?: string
  action?: () => void
}

let __id = 0
const sideNavItemsMap = reactive(new Map<number, SideNavItem[]>())

export const sideNavItems = computed(() => Array.from(sideNavItemsMap.values()).flat())

export function useSideNav(items: MaybeRefOrGetter<SideNavItem[]>) {
  const r = toRef(items)

  let clear = () => {}
  function add(items: SideNavItem[]) {
    clear()
    const id = __id++
    sideNavItemsMap.set(id, items)
    clear = () => {
      sideNavItemsMap.delete(id)
    }
    return id
  }

  watch(
    r,
    (items) => {
      add(items)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    clear()
  })

  return () => {
    clear()
  }
}
