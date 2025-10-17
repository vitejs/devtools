import type { GraphBase, GraphBaseOptions, TreeNode } from 'nanovis'
import type { ComputedRef, MaybeRef } from 'vue'
import { createColorGetterSpectrum } from 'nanovis'
import { computed, nextTick, onUnmounted, ref, shallowRef, unref, watch } from 'vue'
import { isDark } from '~/composables/dark'
import { settings } from '~/state/settings'
import { bytesToHumanSize } from '~/utils/format'

export interface ChartGraphOptions<T, I> {
  data: ComputedRef<T[]> | MaybeRef<T[]>
  nameKey: string
  sizeKey: string
  rootText?: string
  nodeType?: string
  graphOptions?: GraphBaseOptions<I | undefined>
  onUpdate?: () => void
}

export function useChartGraph<T extends Record<string, any>, I extends T & Record<string, any>, N extends TreeNode<any>>(options: ChartGraphOptions<T, I>) {
  const { data, nameKey, sizeKey, rootText, nodeType, graphOptions, onUpdate } = options
  const nodeHover = shallowRef<N | undefined>(undefined)
  const nodeSelected = shallowRef<N | undefined>(undefined)
  const selectedNode = ref<I | undefined>(undefined)
  const graph = shallowRef<GraphBase<I | undefined, GraphBaseOptions<I | undefined>> | undefined>(undefined)
  let dispose: () => void | undefined

  const tree = computed(() => {
    const _data = unref(data)
    const map = new Map<string, N>()
    let maxDepth = 0

    const root = {
      id: '~root',
      text: rootText,
      size: 0,
      sizeSelf: 0,
      children: [],
    } as unknown as N

    if (!_data?.length) {
      return {
        map,
        root,
        maxDepth,
      }
    }
    const macrosTasks: (() => void)[] = []

    macrosTasks.unshift(() => {
      root.size += root.children.reduce((acc, i) => acc + i.size, 0)
      root.subtext = bytesToHumanSize(root.size).join(' ')
      root.children.sort((a, b) => b.size - a.size || a.id.localeCompare(b.id))
    })

    function dataToNode(data: T, path: string, name: string, parent: N, depth: number): N {
      if (map.has(path)) {
        return map.get(path)!
      }

      if (depth > maxDepth) {
        maxDepth = depth
      }

      const node = {
        id: path,
        text: name,
        size: 0,
        sizeSelf: 0,
        children: [],
        meta: {
          ...data,
          path: name,
          type: 'folder',
        },
        parent,
      } as unknown as N

      map.set(path, node)
      parent.children.push(node)

      macrosTasks.unshift(() => {
        const selfSize = node.sizeSelf
        node.size += node.children.reduce((acc, i) => acc + i.size, 0)
        node.subtext = bytesToHumanSize(node.size).join(' ')

        if (node.children.length && selfSize / node.size > 0.1) {
          node.children.push({
            id: `${node.id}-self`,
            text: '',
            size: selfSize,
            sizeSelf: selfSize,
            subtext: bytesToHumanSize(selfSize).join(' '),
            children: [],
            meta: {
              ...data,
              path: '',
              type: nodeType,
            },
            parent: node,
          })
        }

        node.children.sort((a, b) => b.size - a.size || a.id.localeCompare(b.id))
      })

      return node
    }

    function processData(data: T) {
      const parts: string[] = data[nameKey].split('/').filter(Boolean)
      let current = root
      let currentPath = ''
      let depth = 0

      parts.forEach((part, index) => {
        currentPath += (currentPath ? '/' : '') + part
        depth++

        if (index === parts.length - 1) {
          const fileNode = {
            id: data[nameKey],
            text: part,
            size: data[sizeKey],
            sizeSelf: data[sizeKey],
            subtext: bytesToHumanSize(data[sizeKey]).join(' '),
            children: [],
            meta: {
              ...data,
              path: part,
              type: nodeType,
            },
          } as unknown as N

          current.children.push(fileNode)
          map.set(data[nameKey], fileNode)
        }
        else {
          current = dataToNode(data, currentPath, part, current, depth)
        }
      })
    }

    _data.forEach(processData)

    macrosTasks.forEach(fn => fn())

    return {
      map,
      root,
      maxDepth,
    }
  })

  const chartOptions = computed<GraphBaseOptions<I | undefined>>(() => {
    return {
      animate: settings.value.chartAnimation,
      palette: {
        stroke: isDark.value ? '#222' : '#555',
        fg: isDark.value ? '#fff' : '#000',
        bg: isDark.value ? '#111' : '#fff',
      },
      getColor: createColorGetterSpectrum(
        tree.value.root,
        isDark.value ? 0.8 : 0.9,
        isDark.value ? 1 : 1.1,
      ),
      getSubtext: (node) => {
        return node.subtext
      },
      ...graphOptions,
    }
  })

  function selectNode(node: N | null, animate?: boolean) {
    selectedNode.value = node?.meta
    if (!node?.children.length)
      node = node?.parent as unknown as N | null
    graph.value?.select(node, animate)
  }

  function buildGraph() {
    dispose?.()

    nodeSelected.value = tree.value.root

    onUpdate?.()

    nextTick(() => {
      const selected = selectedNode.value ? tree.value.map.get(selectedNode.value[nameKey]) || null : null
      if (selected)
        selectNode(selected, false)
    })

    dispose = () => {
      graph.value?.dispose()
      graph.value = undefined
    }
  }

  watch(
    () => [tree.value, chartOptions.value],
    () => {
      buildGraph()
    },
    {
      deep: true,
      immediate: false,
    },
  )

  nextTick(() => {
    buildGraph()
  })

  onUnmounted(() => {
    dispose?.()
  })

  return {
    tree,
    graph,
    chartOptions,
    nodeHover,
    nodeSelected,
    selectedNode,
    selectNode,
    buildGraph,
  }
}
