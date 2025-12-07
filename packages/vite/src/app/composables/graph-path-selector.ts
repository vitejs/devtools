import type { ComputedRefWithControl } from '@vueuse/core'
import type { ComputedRef, Ref } from 'vue'
import { computedWithControl } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, ref } from 'vue'

export interface GraphPathSelector<T> {
  state: { value: { search: string, selected: string | null } }
  modules: ComputedRef<T[]>
  fuse: Ref<ComputedRefWithControl<Fuse<T>> | undefined>
  initSelector: (modules: ComputedRef<T[]>) => void
  select: (module: T) => void
  clear: () => void
}

export function useGraphPathSelector<T extends { id: string }>(options: {
  getModules: () => T[]
}): GraphPathSelector<T> {
  const state = ref<{
    search: string
    selected: string | null
  }>({
    search: '',
    selected: null,
  })
  const fuse = ref<ComputedRefWithControl<Fuse<T>>>() as unknown as Ref<ComputedRefWithControl<Fuse<T>>>

  const modules = computed(options.getModules)

  function initSelector(modules: ComputedRef<T[]>) {
    fuse.value = computedWithControl(
      modules,
      () => new Fuse(modules.value, {
        includeScore: true,
        keys: ['id'],
        ignoreLocation: true,
        threshold: 0.4,
      }),
    )
  }

  function select(node: T) {
    state.value.selected = node.id
    state.value.search = ''
  }

  function clear() {
    state.value.selected = null
  }

  return {
    state,
    modules,
    fuse,
    initSelector,
    select,
    clear,
  }
}

export function useGraphPathManager<T extends { id: string, imports: Record<string, any>[] }>(
  options: {
    onToggle: (visible: boolean) => void
    dataMap: ComputedRef<Map<string, Omit<T, 'id'>>>
    list: ComputedRef<T[]>
    importIdKey: string
  },
) {
  const {
    onToggle,
    dataMap,
    list,
    importIdKey,
  } = options

  const pathSelectorVisible = ref<boolean>(false)
  const pathNodes = ref({
    start: '',
    end: '',
  })

  function togglePathSelector(state?: boolean) {
    pathSelectorVisible.value = state ?? !pathSelectorVisible.value
    onToggle?.(pathSelectorVisible.value)
  }

  function selectPathNodes(nodes: { start: string, end: string }) {
    pathNodes.value = {
      start: nodes.start,
      end: nodes.end,
    }
  }

  const normalizedGraph = computed(() => {
    const { start, end } = pathNodes.value
    if (!start && !end)
      return list.value

    const linkedNodes = new Set<string>()

    const bfs = (startId: string, getNext: (id: string) => string[], stopAt?: string) => {
      const queue = [startId]
      const visited = new Set<string>()
      const pathMap = new Map<string, string[]>([[`${startId}`, [`${startId}`]]])

      while (queue.length > 0) {
        const id = queue.shift()!

        if (visited.has(id))
          continue
        visited.add(id)

        if (stopAt) {
          if (id === stopAt)
            pathMap.get(id)?.forEach(nodeId => linkedNodes.add(nodeId))
        }
        else {
          linkedNodes.add(id)
        }

        if (!stopAt || id !== stopAt) {
          getNext(id).forEach((nextId) => {
            if (!visited.has(`${nextId}`)) {
              queue.push(`${nextId}`)
              if (stopAt)
                pathMap.set(`${nextId}`, [...(pathMap.get(id) || []), `${nextId}`])
            }
          })
        }
      }
    }

    if (start && end) {
      bfs(start, id => dataMap.value.get(id)?.imports!.map(i => i[importIdKey]) || [], end)
    }
    else if (start) {
      bfs(start, id => dataMap.value.get(id)?.imports!.map(i => i[importIdKey]) || [])
    }

    return list.value.filter(x => linkedNodes.has(x.id)).map((m) => {
      if (m.id === start) {
        return {
          ...m,
          importers: [],
        }
      }
      return m
    })
  })

  return {
    pathSelectorVisible,
    togglePathSelector,
    pathNodes,
    selectPathNodes,
    normalizedGraph,
  }
}
