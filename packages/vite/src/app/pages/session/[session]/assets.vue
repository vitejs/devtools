<script setup lang="ts">
import type { RolldownAssetInfo, SessionContext } from '~~/shared/types'
import type { ClientSettings } from '~/state/settings'
import type { AssetChartInfo, AssetChartNode } from '~/types/chart'
import { useRoute, useRouter } from '#app/composables/router'
import { useRpc } from '#imports'
import { computedWithControl, useAsyncState, useMouse } from '@vueuse/core'
import Fuse from 'fuse.js'
import { Flamegraph, Sunburst, Treemap } from 'nanovis'
import { computed, reactive, ref, watch } from 'vue'
import ChartTreemap from '~/components/chart/Treemap.vue'
import { useChartGraph } from '~/composables/chart'
import { settings } from '~/state/settings'

const props = defineProps<{
  session: SessionContext
}>()

const mouse = reactive(useMouse())
const searchValue = ref<{ search: string }>({
  search: '',
})
const router = useRouter()
const route = useRoute()
const assetViewTypes = [
  {
    label: 'List',
    value: 'list',
    icon: 'i-ph-list-duotone',
  },
  {
    label: 'Folder',
    value: 'folder',
    icon: 'i-ph-folder-duotone',
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
const rpc = useRpc()
const { state: assets, isLoading } = useAsyncState(
  async () => {
    return await rpc.value.$call(
      'vite:rolldown:get-assets-list',
      { session: props.session.id },
    )
  },
  null,
)

const fuse = computedWithControl(
  () => assets.value,
  () => new Fuse(assets.value!, {
    includeScore: true,
    keys: ['filename'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const searched = computed(() => {
  if (!searchValue.value.search) {
    return assets.value!
  }
  return fuse.value
    .search(searchValue.value.search)
    .map(r => r.item)
})

function toggleDisplay(type: ClientSettings['assetViewType']) {
  settings.value.assetViewType = type
}

const { tree, chartOptions, graph, nodeHover, nodeSelected, selectedNode, selectNode, buildGraph } = useChartGraph<Omit<RolldownAssetInfo, 'type'>, AssetChartInfo, AssetChartNode>({
  data: searched,
  nameKey: 'filename',
  sizeKey: 'size',
  rootText: 'Project',
  nodeType: 'file',
  graphOptions: {
    onClick(node) {
      if (node)
        nodeHover.value = node
      if (node.meta?.type === 'file') {
        selectedNode.value = node.meta
        router.replace({ query: { asset: node.meta.filename } })
      }
    },
    onHover(node) {
      if (node && !route.query.asset)
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
    switch (settings.value.assetViewType) {
      case 'sunburst':
        graph.value = new Sunburst(tree.value.root, chartOptions.value)
        break
      case 'treemap':
        graph.value = new Treemap(tree.value.root, {
          ...chartOptions.value,
          selectedPaddingRatio: 0,
        })
        break
      default:
        graph.value = new Flamegraph(tree.value.root, chartOptions.value)
    }
  },
})

watch(() => settings.value.assetViewType, () => {
  buildGraph()
})
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <DataSearchPanel v-model="searchValue" :rules="[]">
        <div flex="~ gap-2 items-center" p2 border="t base">
          <span op50 pl2 text-sm>View as</span>
          <button
            v-for="viewType of assetViewTypes"
            :key="viewType.value"
            btn-action
            :class="settings.assetViewType === viewType.value ? 'bg-active' : 'grayscale op50'"
            @click="toggleDisplay(viewType.value)"
          >
            <div :class="viewType.icon" />
            {{ viewType.label }}
          </button>
        </div>
      </DataSearchPanel>
    </div>
    <div of-auto h-screen flex="~ col gap-2" pt32>
      <template v-if="settings.assetViewType === 'list'">
        <AssetsList v-if="searched?.length" :assets="searched" :session="session" />
        <div
          absolute bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
        >
          <span op50>{{ searched.length }} of {{ assets?.length || 0 }}</span>
        </div>
      </template>
      <template v-else-if="settings.assetViewType === 'folder'">
        <AssetsFolder v-if="searched?.length" :assets="searched" :session="session" />
      </template>
      <template v-else-if="settings.assetViewType === 'treemap'">
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
      </template>
      <template v-else-if="settings.assetViewType === 'sunburst'">
        <AssetsSunburst
          v-if="graph" :graph="graph"
          :selected="nodeSelected"
          @select="x => selectNode(x)"
        />
      </template>
      <template v-else-if="settings.assetViewType === 'flamegraph'">
        <AssetsFlamegraph
          v-if="graph" :graph="graph"
        />
      </template>
    </div>
    <DisplayGraphHoverView :hover-x="mouse.x" :hover-y="mouse.y">
      <div
        v-if="nodeHover?.meta"
        bg-glass border="~ base rounded" p2 text-sm
        flex="~ col gap-2"
      >
        <div flex="~ gap-1 items-center">
          {{ nodeHover.text }}
        </div>
        <div flex="~ gap-1 items-center">
          <DisplayFileSizeBadge :bytes="nodeHover.size" :percent="false" />
        </div>
      </div>
    </DisplayGraphHoverView>
  </div>
</template>
