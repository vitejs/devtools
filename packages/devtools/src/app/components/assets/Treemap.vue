<script setup lang="ts">
import type { Asset as AssetInfo } from '@rolldown/debug'
import type { GraphBase, GraphBaseOptions } from 'nanovis'
import type { SessionContext } from '~~/shared/types'
import type { AssetChartInfo, AssetChartNode } from '~/types/assets'
import { useRouter } from '#app/composables/router'
import { useMouse } from '@vueuse/core'
import { createColorGetterSpectrum, Treemap } from 'nanovis'
import { computed, nextTick, onUnmounted, reactive, ref, shallowRef, watch } from 'vue'
import { isDark } from '~/composables/dark'
import { settings } from '~/state/settings'
import { bytesToHumanSize } from '~/utils/format'

const props = defineProps<{
  assets: AssetInfo[]
  session: SessionContext
}>()

const router = useRouter()
const mouse = reactive(useMouse())
const graph = shallowRef<GraphBase<AssetChartInfo | undefined, GraphBaseOptions<AssetChartInfo | undefined>> | undefined>(undefined)
const nodeHover = shallowRef<AssetChartNode | undefined>(undefined)
const nodeSelected = shallowRef<AssetChartNode | undefined>(undefined)
const selectedNode = ref<AssetChartInfo | undefined>(undefined)
let dispose: () => void | undefined

const tree = computed(() => {
  const assets = props.assets
  const map = new Map<string, AssetChartNode>()
  let maxDepth = 0

  const root: AssetChartNode = {
    id: '~root',
    text: 'Project',
    size: 0,
    sizeSelf: 0,
    children: [],
  }

  const macrosTasks: (() => void)[] = []

  macrosTasks.unshift(() => {
    root.size += root.children.reduce((acc, i) => acc + i.size, 0)
    root.subtext = bytesToHumanSize(root.size).join(' ')
    root.children.sort((a, b) => b.size - a.size || a.id.localeCompare(b.id))
  })

  function assetToNode(asset: AssetInfo, path: string, name: string, parent: AssetChartNode, depth: number): AssetChartNode {
    if (map.has(path)) {
      return map.get(path)!
    }

    if (depth > maxDepth) {
      maxDepth = depth
    }

    const node: AssetChartNode = {
      id: path,
      text: name,
      size: 0,
      sizeSelf: 0,
      children: [],
      meta: {
        chunk_id: 0,
        content: '',
        filename: '',
        size: 0,
        path: name,
        type: 'folder',
      },
      parent,
    }

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
            ...asset,
            path: '',
            type: 'file',
          },
          parent: node,
        })
      }

      node.children.sort((a, b) => b.size - a.size || a.id.localeCompare(b.id))
    })

    return node
  }

  function processAsset(asset: AssetInfo) {
    const parts = asset.filename.split('/').filter(Boolean)
    let current = root
    let currentPath = ''
    let depth = 0

    parts.forEach((part, index) => {
      currentPath += (currentPath ? '/' : '') + part
      depth++

      if (index === parts.length - 1) {
        const fileNode: AssetChartNode = {
          id: asset.filename,
          text: part,
          size: asset.size,
          sizeSelf: asset.size,
          subtext: bytesToHumanSize(asset.size).join(' '),
          children: [],
          meta: {
            ...asset,
            path: part,
            type: 'file',
          },
        }

        current.children.push(fileNode)
        map.set(asset.filename, fileNode)
      }
      else {
        current = assetToNode(asset, currentPath, part, current, depth)
      }
    })
  }

  assets.forEach(processAsset)

  macrosTasks.forEach(fn => fn())

  return {
    map,
    root,
    maxDepth,
  }
})

const options = computed<GraphBaseOptions<AssetChartInfo | undefined>>(() => {
  return {
    onClick(node) {
      if (node)
        nodeHover.value = node
      if (node.meta?.type === 'file') {
        selectedNode.value = node.meta
        router.replace({ query: { asset: node.meta.filename } })
      }
    },
    onHover(node) {
      if (node)
        nodeHover.value = node
    },
    onLeave() {
      nodeHover.value = undefined
    },
    onSelect(node) {
      nodeSelected.value = node || tree.value.root
      selectedNode.value = node?.meta
    },
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
  }
})

function selectNode(node: AssetChartNode | null, animate?: boolean) {
  selectedNode.value = node?.meta
  if (!node?.children.length)
    node = node?.parent || null
  graph.value?.select(node, animate)
}

watch(() => [tree.value, options.value], () => {
  dispose?.()

  nodeSelected.value = tree.value.root

  if (tree.value?.root) {
    graph.value = new Treemap(tree.value.root, {
      ...options.value,
      selectedPaddingRatio: 0,
    })
  }
  nextTick(() => {
    const selected = selectedNode.value ? tree.value.map.get(selectedNode.value.filename) || null : null
    if (selected)
      selectNode(selected, false)
  })

  dispose = () => {
    graph.value?.dispose()
    graph.value = undefined
  }
}, {
  deep: true,
  immediate: true,
})

onUnmounted(() => {
  dispose?.()
})
</script>

<template>
  <ChartAssetTreemap
    v-if="graph"
    :graph="graph"
    :selected="nodeSelected"
    @select="x => selectNode(x)"
  />
  <div
    v-if="nodeHover?.meta"
    bg-glass fixed z-panel-nav border="~ base rounded" p2 text-sm
    flex="~ col gap-2"
    :style="{
      left: `${mouse.x + 10}px`,
      top: `${mouse.y + 10}px`,
    }"
  >
    <div flex="~ gap-1 items-center">
      {{ nodeHover.text }}
    </div>
    <div flex="~ gap-1 items-center">
      <DisplayFileSizeBadge :bytes="nodeHover.size" :percent="false" />
    </div>
  </div>
</template>
