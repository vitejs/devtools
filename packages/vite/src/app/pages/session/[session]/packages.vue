<script setup lang="ts">
import type { PackageInfo, SessionContext } from '~~/shared/types/data'
import type { ClientSettings } from '~/state/settings'
import type { PackageChartInfo, PackageChartNode } from '~/types/chart'
import { useRoute, useRouter } from '#app/composables/router'
import { useRpc } from '#imports'
import { computedWithControl, useAsyncState, useMouse } from '@vueuse/core'
import Fuse from 'fuse.js'
import { Treemap } from 'nanovis'
import { computed, reactive, ref, watch } from 'vue'
import ChartTreemap from '~/components/chart/Treemap.vue'
import { useChartGraph } from '~/composables/chart'
import { settings } from '~/state/settings'

const props = defineProps<{
  session: SessionContext
}>()

const mouse = reactive(useMouse())
const route = useRoute()
const router = useRouter()

const packageTypeRules = [
  {
    match: /.*/,
    name: 'direct',
    description: 'Direct Dependencies',
    icon: 'i-octicon:package-dependencies-24 light:filter-invert-30!',
  },
  {
    match: /.*/,
    name: 'transitive',
    description: 'Transitive Dependencies',
    icon: 'i-octicon:package-24  light:filter-invert-30!',
  },
]
const rpc = useRpc()
const searchValue = ref<{ search: string, selected: string[] }>({
  search: '',
  selected: ['direct', 'transitive'],
})
const { state: packages, isLoading } = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-packages']?.({
      session: props.session.id,
    })
  },
  null,
)

const fuse = computedWithControl(
  () => packages.value,
  () => new Fuse(packages.value!, {
    includeScore: true,
    keys: ['name'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const duplicatePackagesCount = computed(() => {
  if (!packages.value) {
    return 0
  }
  return Object.values(packages.value!.reduce((acc, p) => {
    acc[p.name] = (acc[p.name] || 0) + 1
    return acc
  }, {} as Record<string, number>)).filter(count => count > 1).length
})

const packageViewTypes = computed(() => [
  {
    label: 'Table',
    value: 'table',
    icon: 'i-ph-table-duotone',
  },
  {
    label: 'Treemap',
    value: 'treemap',
    icon: 'i-ph-checkerboard-duotone',
  },
  {
    label: `Duplicate Packages${duplicatePackagesCount.value > 0 ? ` (${duplicatePackagesCount.value})` : ''}`,
    value: 'duplicate-packages',
    icon: 'i-ph-package-duotone',
  },
] as const)

const searched = computed(() => (
  searchValue.value.search
    ? fuse.value.search(searchValue.value.search).map(r => r.item)
    : [...(packages.value || [])]),
)

const normalizedPackages = computed(() => {
  const packagesSizeSortType = settings.value.packageSizeSortType
  const data = [...searched.value].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const sortedPackages = packagesSizeSortType
    ? data.sort((a, b) => packagesSizeSortType === 'asc' ? a.transformedCodeSize - b.transformedCodeSize : b.transformedCodeSize - a.transformedCodeSize)
    : data

  return sortedPackages.filter(item => !searchValue.value.selected || searchValue.value.selected.some(rule => rule.match(item.type!)))
})

function toggleDisplay(type: ClientSettings['packageViewType']) {
  settings.value.packageViewType = type
}

const { tree, chartOptions, graph, nodeHover, nodeSelected, selectedNode, selectNode, buildGraph } = useChartGraph<PackageInfo, PackageChartInfo, PackageChartNode>({
  data: normalizedPackages,
  nameKey: 'name',
  sizeKey: 'transformedCodeSize',
  rootText: 'Packages',
  nodeType: 'package',
  graphOptions: {
    onHover(node) {
      if (node && !route.query.package)
        nodeHover.value = node
      if (node === null)
        nodeHover.value = undefined
    },
    onClick(node) {
      if (node.meta?.type === 'package') {
        router.replace({ query: { ...route.query, package: `${node.meta?.name}@${node.meta?.version}` } })
      }
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
    if (settings.value.packageViewType === 'treemap') {
      graph.value = new Treemap(tree.value.root, {
        ...chartOptions.value,
        selectedPaddingRatio: 0,
      })
    }
  },
})

watch(() => settings.value.packageViewType, () => {
  buildGraph()
})
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <DataSearchPanel v-model="searchValue" :rules="packageTypeRules">
        <div flex="~ gap-2 items-center" p2 border="t base">
          <span op50 pl2 text-sm>View as</span>
          <button
            v-for="viewType of packageViewTypes"
            :key="viewType.value"
            btn-action
            :class="settings.packageViewType === viewType.value ? 'bg-active' : 'grayscale op50'"
            @click="toggleDisplay(viewType.value)"
          >
            <div :class="viewType.icon" />
            {{ viewType.label }}
          </button>
        </div>
      </DataSearchPanel>
    </div>
    <div of-auto h-screen flex="~ col gap-2" pt44 px4 pb4>
      <template v-if="settings.packageViewType === 'table'">
        <PackagesTable :packages="normalizedPackages" :session="session" />
        <div
          absolute bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
        >
          <span op50>{{ searched.length }} of {{ packages?.length || 0 }}</span>
        </div>
      </template>
      <template v-else-if="settings.packageViewType === 'treemap'">
        <ChartTreemap
          v-if="graph && normalizedPackages.length"
          :graph="graph"
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
        <span v-else w-full h-48 flex="~ items-center justify-center" op50 italic>
          No Data
        </span>
      </template>
      <template v-else-if="settings.packageViewType === 'duplicate-packages'">
        <PackagesDuplicated :packages="normalizedPackages" :session="session" />
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
