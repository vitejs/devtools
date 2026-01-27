<script setup lang="ts">
import type { RolldownChunkInfo, SessionContext } from '~~/shared/types/data'
import type { ClientSettings } from '~/state/settings'
import type { ChunkChartInfo, ChunkChartNode } from '~/types/chart'
import { useRpc } from '#imports'
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'
import VisualLoading from '@vitejs/devtools-ui/components/VisualLoading.vue'
import { computedWithControl, useAsyncState, useMouse } from '@vueuse/core'
import Fuse from 'fuse.js'
import { Flamegraph, Sunburst, Treemap } from 'nanovis'
import { computed, reactive, ref, watch } from 'vue'
import ChartTreemap from '~/components/chart/Treemap.vue'
import { useChartGraph } from '~/composables/chart'
import { useGraphPathManager } from '~/composables/graph-path-selector'
import { settings } from '~/state/settings'

const props = defineProps<{
  session: SessionContext
}>()

const mouse = reactive(useMouse())

const chunkViewTypes = [
  {
    label: 'List',
    value: 'list',
    icon: 'i-ph-list-bullets-duotone',
  },
  {
    label: 'Detailed List',
    value: 'detailed-list',
    icon: 'i-ph-list-magnifying-glass-duotone',
  },
  {
    label: 'Graph',
    value: 'graph',
    icon: 'i-ph-graph-duotone',
  },
  {
    label: 'Treemap',
    value: 'treemap',
    icon: 'i-ph-checkerboard-duotone',
  },
  {
    label: 'Sunburst',
    value: 'sunburst',
    icon: 'i-ph-chart-donut-duotone',
  },
  {
    label: 'Flamegraph',
    value: 'flamegraph',
    icon: 'i-ph-chart-bar-horizontal-duotone',
  },
] as const

const searchValue = ref<{ search: string | false }>({
  search: '',
})

const rpc = useRpc()
const { state: chunks, isLoading } = useAsyncState(
  async () => {
    return await rpc.value.call(
      'vite:rolldown:get-chunks-graph',
      { session: props.session.id },
    )
  },
  null,
)

const chunksMap = computed(() => {
  const map = new Map<string, RolldownChunkInfo>()
  chunks.value?.forEach((c) => {
    map.set(`${c.chunk_id}`, c)
  })
  return map
})

const normalizedChunks = computed(() => chunks.value?.map(x => ({
  ...x,
  id: `${x.chunk_id}`,
})) ?? [])

const fuse = computedWithControl(
  () => normalizedChunks.value,
  () => new Fuse(normalizedChunks.value!, {
    includeScore: true,
    keys: ['name'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const searched = computed<Array<RolldownChunkInfo & { id: string }>>(() => {
  if (!searchValue.value.search) {
    return normalizedChunks.value!
  }
  return fuse.value
    .search(searchValue.value.search)
    .map(r => r.item)
})

const { pathSelectorVisible, pathNodes, selectPathNodes, togglePathSelector, normalizedGraph } = useGraphPathManager<RolldownChunkInfo & { id: string }>({
  onToggle: (visible) => {
    searchValue.value.search = visible ? false : ''
  },
  dataMap: computed(() => chunksMap.value),
  list: computed(() => searched.value),
  importIdKey: 'chunk_id',
})

function toggleDisplay(type: ClientSettings['chunkViewType']) {
  settings.value.chunkViewType = type
}

// Calculate chunk size from modules
const modulesMap = computed(() => {
  const map = new Map()
  for (const module of props.session.modulesList) {
    map.set(module.id, module)
  }
  return map
})

function getChunkSize(chunk: RolldownChunkInfo): number {
  // First try to use asset size if available
  if (chunk.asset?.size) {
    return chunk.asset.size
  }

  // Otherwise, calculate from module transforms
  return chunk.modules.reduce((total, id) => {
    const moduleInfo = modulesMap.value.get(id)
    if (!moduleInfo || !moduleInfo.buildMetrics?.transforms?.length)
      return total

    const transforms = moduleInfo.buildMetrics.transforms
    return total + transforms[transforms.length - 1]!.transformed_code_size
  }, 0)
}

// Normalize chunks with size for chart visualization
const chunksWithSize = computed(() => {
  return searched.value.map(chunk => ({
    ...chunk,
    filename: chunk.name || `chunk-${chunk.chunk_id}`,
    size: getChunkSize(chunk),
  }))
})

// Chart graph setup for nanovis visualizations
const { tree, chartOptions, graph, nodeHover, nodeSelected, selectedNode, selectNode, buildGraph } = useChartGraph<
  Omit<RolldownChunkInfo, 'type'>,
  ChunkChartInfo,
  ChunkChartNode
>({
  data: chunksWithSize,
  nameKey: 'filename',
  sizeKey: 'size',
  rootText: 'Chunks',
  nodeType: 'chunk',
  graphOptions: {
    onClick(node) {
      if (node)
        nodeHover.value = node
    },
    onHover(node) {
      if (node)
        nodeHover.value = node
      if (node === null)
        nodeHover.value = undefined
    },
    onLeave() {
      nodeHover.value = undefined
    },
    onSelect(node) {
      nodeSelected.value = node || tree.value.root
      selectedNode.value = node?.meta
    },
  },
  onUpdate() {
    switch (settings.value.chunkViewType) {
      case 'sunburst':
        graph.value = new Sunburst(tree.value.root, chartOptions.value)
        break
      case 'treemap':
        graph.value = new Treemap(tree.value.root, {
          ...chartOptions.value,
          selectedPaddingRatio: 0,
        })
        break
      case 'flamegraph':
        graph.value = new Flamegraph(tree.value.root, chartOptions.value)
        break
    }
  },
})

watch(() => settings.value.chunkViewType, () => {
  if (['treemap', 'sunburst', 'flamegraph'].includes(settings.value.chunkViewType)) {
    buildGraph()
  }
})
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <DataSearchPanel v-model="searchValue" :rules="[]">
        <template v-if="pathSelectorVisible" #search>
          <DataPathSelector :session="session" :data="searched" import-id-key="chunk_id" :search-keys="['name']" @select="selectPathNodes" @close="togglePathSelector(false)">
            <template #list="{ select, data }">
              <ChunksFlatList
                :session="session"
                :chunks="data"
                :link="false"
                :basic="true"
                @select="select"
              />
            </template>
            <template #item="{ id }">
              {{ chunksMap.get(id)?.name || '[unnamed]' }}
            </template>
          </DataPathSelector>
        </template>
        <template #search-end>
          <div v-if="settings.chunkViewType === 'graph'" h10 mr2 flex="~ items-center">
            <button
              w-8 h-8 rounded-full flex items-center justify-center
              hover="bg-active op100" op50 title="Graph Path Selector" @click="togglePathSelector(true)"
            >
              <i i-ri:route-line flex />
            </button>
          </div>
        </template>
        <div flex="~ gap-2 items-center" p2 border="t base">
          <span op50 pl2 text-sm>View as</span>
          <button
            v-for="viewType of chunkViewTypes"
            :key="viewType.value"
            btn-action
            :class="settings.chunkViewType === viewType.value ? 'bg-active' : 'grayscale op50'"
            @click="toggleDisplay(viewType.value)"
          >
            <div :class="viewType.icon" />
            {{ viewType.label }}
          </button>
        </div>
      </DataSearchPanel>
    </div>
    <template v-if="settings.chunkViewType === 'list'">
      <div class="px5 pt32 of-auto h-screen" flex="~ col gap-4">
        <ChunksFlatList
          :session="session"
          :chunks="searched"
        />
      </div>
    </template>
    <template v-if="settings.chunkViewType === 'detailed-list'">
      <div class="px5 pt32 of-auto h-screen" flex="~ col gap-4">
        <template v-for="chunk of searched" :key="chunk.id">
          <DataChunkDetails
            border="~ base rounded-lg"
            p3
            :chunk="chunk"
            :chunks="searched!"
            :session="session"
          />
        </template>
      </div>
    </template>
    <template v-else-if="settings.chunkViewType === 'graph'">
      <ChunksGraph
        class="pt32"
        :session="session"
        :chunks="normalizedGraph"
        :entry-id="pathNodes.start"
      />
    </template>
    <template v-else-if="settings.chunkViewType === 'treemap'">
      <div of-auto h-screen flex="~ col gap-2" pt32>
        <ChartTreemap
          v-if="graph" :graph="graph"
          :selected="nodeSelected"
          @select="x => selectNode(x)"
        >
          <template #default="{ selected, options, onSelect }">
            <ChartNavBreadcrumb
              border="b base" py2 min-h-10
              :selected="selected"
              :options="options"
              @select="onSelect"
            />
          </template>
        </ChartTreemap>
      </div>
    </template>
    <template v-else-if="settings.chunkViewType === 'sunburst'">
      <div of-auto h-screen flex="~ col gap-2" pt32>
        <ChunksSunburst
          v-if="graph" :graph="graph"
          :selected="nodeSelected"
          @select="x => selectNode(x)"
        />
      </div>
    </template>
    <template v-else-if="settings.chunkViewType === 'flamegraph'">
      <div of-auto h-screen flex="~ col gap-2" pt32>
        <ChunksFlamegraph
          v-if="graph" :graph="graph"
        />
      </div>
    </template>
    <DisplayGraphHoverView :hover-x="mouse.x" :hover-y="mouse.y">
      <div
        v-if="nodeHover?.meta"
        border="~ base rounded-lg" bg-base p2
        flex="~ col gap-2"
        min-w-50
        shadow-lg
      >
        <div flex="~ gap-2 items-center">
          <i i-ph-shapes-duotone flex-none />
          <span truncate>{{ nodeHover.meta.name || '[unnamed]' }}</span>
        </div>
        <div flex="~ gap-2 items-center">
          <span op50 text-xs>Size:</span>
          <DisplayFileSizeBadge :bytes="nodeHover.meta.size" text-xs />
        </div>
        <div v-if="nodeHover.meta.modules?.length" flex="~ gap-2 items-center">
          <span op50 text-xs>Modules:</span>
          <span text-xs>{{ nodeHover.meta.modules?.length }}</span>
        </div>
        <div v-if="nodeHover.meta.is_initial" flex="~ gap-2 items-center">
          <DisplayBadge text="initial" />
        </div>
      </div>
    </DisplayGraphHoverView>
  </div>
</template>
