import type { MaybeRefOrGetter } from 'vue'
import { computed, onScopeDispose, reactive, toRef, watch } from 'vue'

export interface SideNavItem {
  icon: string
  title: string
  category?: string
  to?: string
  action?: () => void
}

let id = 0
const sideNavItemsMap = reactive(new Map<number, SideNavItem[]>())

export const sideNavItems = computed(() => Array.from(sideNavItemsMap.values()).flat())

export function useSideNav(items: MaybeRefOrGetter<SideNavItem[]>) {
  const itemsRef = toRef(items)

  let clear = () => {}
  function add(nextItems: SideNavItem[]) {
    clear()
    const currentId = id++
    sideNavItemsMap.set(currentId, nextItems)
    clear = () => {
      sideNavItemsMap.delete(currentId)
    }
  }

  watch(
    itemsRef,
    (nextItems) => {
      add(nextItems)
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
