<script setup lang="ts">
import type { DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import type { TreeNodeInput } from 'nanovis'
import type { PluginChartInfo, PluginChartNode } from '~/types/chart'
import type { ViteModuleListItem } from '~/types/modules'
import type { VitePluginBuildInfo } from '~/types/plugins'
import DisplayCloseButton from '@vitejs/devtools-ui/components/Display/DisplayCloseButton.vue'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import DisplayNumberBadge from '@vitejs/devtools-ui/components/Display/DisplayNumberBadge.vue'
import DisplayPluginName from '@vitejs/devtools-ui/components/Display/DisplayPluginName.vue'
import PluginsSunburst from '@vitejs/devtools-ui/components/Plugins/PluginsSunburst.vue'
import { formatDuration, normalizeTimestamp } from '@vitejs/devtools-ui/utils/format'
import { useAsyncState, useDebounceFn, useMouse } from '@vueuse/core'
import { normalizeTreeNode, Sunburst } from 'nanovis'
import { computed, reactive, watch } from 'vue'
import { useRpc } from '#imports'
import { useChartGraph } from '~/composables/chart'
import { onInspectModuleUpdated } from '~/composables/rpc'
import { settings } from '~/state/settings'
import { parseReadablePath } from '~/utils/filepath'
import { getFileTypeFromModuleId, ModuleTypeRules } from '~/utils/icon'

type InspectQuery = Parameters<DevToolsRpcServerFunctions['vite:inspect:get-plugin-details']>[0]

const props = defineProps<{
  plugin: string
  query: InspectQuery
  modules: ViteModuleListItem[]
  root: string
}>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const rpc = useRpc()
const { state, isLoading, execute } = useAsyncState(
  async () => {
    const res = await rpc.value.call(
      'vite:inspect:get-plugin-details',
      props.query,
      props.plugin,
    )
    return res
  },
  null,
)

const reloadPluginDetails = useDebounceFn(() => {
  execute()
}, 100)

watch(
  () => [props.query.vite, props.query.env, props.plugin],
  () => {
    execute()
  },
)

onInspectModuleUpdated(() => {
  reloadPluginDetails()
})

const processedModules = computed(() => {
  const seen = new Set()
  return state.value?.calls?.filter((call) => {
    if (seen.has(call.module))
      return false

    seen.add(call.module)
    return true
  }) ?? []
})

const hookLoadDuration = computed(() => state.value?.loadMetrics.reduce((acc, item) => acc + item.duration, 0))

const hookTransformDuration = computed(() => state.value?.transformMetrics.reduce((acc, item) => acc + item.duration, 0))

const hookResolveIdDuration = computed(() => state.value?.resolveIdMetrics.reduce((acc, item) => acc + item.duration, 0))

const totalDuration = computed(() => state.value?.calls?.reduce((acc, item) => acc + item.duration, 0))

const parsedPaths = computed(() => props.modules.map((mod) => {
  const path = parseReadablePath(mod.id, props.root)
  const type = getFileTypeFromModuleId(mod.id)
  return {
    mod,
    path,
    type,
  }
}))
const moduleTypes = computed(() => ModuleTypeRules.filter(rule => parsedPaths.value.some(mod => rule.match.test(mod.mod.id))))

function getModuleGraphLink(moduleId: string | undefined): string | false {
  return moduleId
    ? `/graph?module=${encodeURIComponent(moduleId)}`
    : false
}

const _tree = computed(() => {
  const map = new Map<string, TreeNodeInput<PluginChartInfo | undefined>>()
  const maxDepth = 3
  if (!state.value) {
    return {
      root: createNode({
        id: '~root',
        text: 'Project',
        children: [],
      }),
      map: new Map(),
      maxDepth,
    }
  }

  function createNode(node: TreeNodeInput<PluginChartInfo | undefined>, parent?: PluginChartNode) {
    map.set(node.id!, node)
    const normalizedNode = normalizeTreeNode(node, parent, (a, b) => (b?.meta?.duration ?? 0) - (a?.meta?.duration ?? 0))

    if (normalizedNode.children) {
      normalizedNode.children.forEach((child) => {
        child.parent = normalizedNode
      })
    }

    return normalizedNode
  }

  function createMetricsNodes(prefix: string, metrics: VitePluginBuildInfo[]) {
    const otherTypes = metrics.filter(item => !moduleTypes.value.some(type => getFileTypeFromModuleId(item.module!).name === type.name))
    return [
      ...moduleTypes.value.map((type, idx) => {
        const filteredMetrics = metrics.filter(item => getFileTypeFromModuleId(item.module!).name === type.name)
        return createNode({
          id: `${prefix}-${type.name}-${idx}`,
          text: type.description,
          children: filteredMetrics.map((item, idx) => createNode({
            id: `${prefix}-${idx}`,
            text: item.module,
            size: item.duration,
            meta: item as unknown as PluginChartInfo,
          })),
          meta: {
            type: 'module',
            title: type.description,
            id: `${prefix}-${type.name}-${idx}`,
            duration: filteredMetrics.reduce((acc, item) => acc + item.duration, 0),
          } as unknown as PluginChartInfo,
        })
      }),
      createNode({
        id: `${prefix}-other`,
        text: 'Other',
        children: otherTypes.map((item, idx) => createNode({
          id: `${prefix}-other-${idx}`,
          text: item.module,
          size: item.duration,
          meta: item as unknown as PluginChartInfo,
        })),
        meta: {
          type: 'module',
          title: 'Other',
          id: `${prefix}-other`,
          duration: otherTypes.reduce((acc, item) => acc + item.duration, 0),
        } as unknown as PluginChartInfo,
      }),
    ]
  }

  const resolveIds = createMetricsNodes('resolveId', state.value!.resolveIdMetrics)
  const loads = createMetricsNodes('loads', state.value!.loadMetrics)
  const transforms = createMetricsNodes('transforms', state.value!.transformMetrics)

  function createHookNode(id: string, text: string, children: PluginChartNode[]) {
    return createNode({
      id,
      text,
      children: children.sort((a, b) => b.size - a.size),
      meta: {
        id,
        type: 'hook',
        title: text,
        duration: {
          '~loads': hookLoadDuration.value,
          '~resolves': hookResolveIdDuration.value,
          '~transforms': hookTransformDuration.value,
        }[id],
      } as unknown as PluginChartInfo,
    })
  }

  const children = [
    createHookNode('~resolves', 'Resolve Id', resolveIds),
    createHookNode('~loads', 'Load', loads),
    createHookNode('~transforms', 'Transform', transforms),
  ]

  const root = createNode({
    id: '~root',
    text: 'Project',
    children,
  })

  return {
    root,
    map,
    maxDepth,
  }
})

const mouse = reactive(useMouse())
const { tree, chartOptions, graph, nodeHover, nodeSelected, selectedNode, selectNode, buildGraph } = useChartGraph<PluginChartInfo, PluginChartInfo, PluginChartNode>({
  data: [],
  tree: _tree,
  nameKey: 'id',
  sizeKey: 'duration',
  rootText: 'Project',
  graphOptions: {
    onClick(node) {
      if (node)
        nodeHover.value = node
      selectedNode.value = node?.meta
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
    getSubtext(node) {
      return formatDuration(node.size, true)
    },
  },
  onUpdate() {
    graph.value = new Sunburst(tree.value.root, chartOptions.value)
  },
})

watch(() => settings.value.pluginDetailsViewType, () => {
  buildGraph()
})
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else-if="state?.calls?.length" relative h-full w-full>
    <DisplayCloseButton
      absolute right-2 top-1.5
      @click="emit('close')"
    />
    <div
      bg-glass absolute left-2 top-2 z-panel-content p2
      border="~ base rounded-lg"
      flex="~ col gap-2"
    >
      <div font-mono px1>
        <DisplayPluginName :name="state?.plugin_name!" />
      </div>
      <div text-xs font-mono flex="~ items-center gap-3" ml2>
        <DisplayDuration
          :duration="hookResolveIdDuration" flex="~ gap-1 items-center"
          :title="`Resolve Id hooks cost: ${formatDuration(hookResolveIdDuration, true)}`"
        >
          <span i-ph-magnifying-glass-duotone inline-block />
        </DisplayDuration>
        <DisplayDuration
          :duration="hookLoadDuration" flex="~ gap-1 items-center"
          :title="`Load hooks cost: ${formatDuration(hookLoadDuration, true)}`"
        >
          <span i-ph-upload-simple-duotone inline-block />
        </DisplayDuration>
        <DisplayDuration
          :duration="hookTransformDuration" flex="~ gap-1 items-center"
          :title="`Transform hooks cost: ${formatDuration(hookTransformDuration, true)}`"
        >
          <span i-ph-magic-wand-duotone inline-block />
        </DisplayDuration>
        <span op40>|</span>
        <DisplayDuration
          :duration="totalDuration" flex="~ gap-1 items-center"
          :title="`Total build cost: ${formatDuration(totalDuration, true)}`"
        >
          <span i-ph-clock-duotone inline-block />
        </DisplayDuration>
        <span op40>|</span>
        <DisplayNumberBadge
          :number="processedModules.length" icon="i-catppuccin-java-class-abstract"
          color="transparent color-scale-neutral"
          :title="`Module processed: ${processedModules.length}`"
        />
        <span op40>|</span>
        <DisplayNumberBadge
          :number="state?.calls?.length ?? 0" icon="i-ph-arrow-counter-clockwise"
          color="transparent color-scale-neutral"
          :title="`Total calls: ${state?.calls?.length ?? 0}`"
        />
      </div>
      <div flex="~ gap-2">
        <button
          :class="settings.pluginDetailsViewType === 'flow' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.pluginDetailsViewType = 'flow'"
        >
          <div i-ph-git-branch-duotone rotate-180 />
          Build Flow
        </button>
        <button
          :class="settings.pluginDetailsViewType === 'sunburst' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.pluginDetailsViewType = 'sunburst'"
        >
          <div i-ph-chart-sunburst-duotone />
          Sunburst
        </button>
      </div>
    </div>
    <div of-auto h-full pt-30>
      <FlowmapPluginFlow
        v-if="settings.pluginDetailsViewType === 'flow'"
        :modules="modules"
        :build-metrics="state"
        :root="root"
      />
      <PluginsSunburst
        v-if="settings.pluginDetailsViewType === 'sunburst' && graph"
        :graph="graph"
        :selected="nodeSelected"
        @select="selectNode"
      >
        <template #module="{ child }">
          <DisplayModuleId
            :id="child.text!"
            w-full border-none ws-nowrap
            :cwd="root"
            :link="getModuleGraphLink(child.meta?.graphModuleId)"
            hover="bg-active"
            border="~ base rounded" block px2 py1
          />
        </template>
      </PluginsSunburst>
    </div>
  </div>
  <div v-else flex="~ items-center justify-center" w-full h-full>
    <span italic op50>
      No data
    </span>
  </div>
  <DisplayGraphHoverView :hover-x="mouse.x" :hover-y="mouse.y">
    <div
      v-if="nodeHover"
      border="~ base" rounded-lg shadow-lg px3 py2
      bg-glass pointer-events-none text-sm max-w-80
    >
      <div v-if="nodeHover.meta?.title" flex="~ items-center gap2">
        {{ nodeHover.meta.title }}
        <DisplayDuration :duration="nodeHover.meta.duration" />
      </div>
      <template v-else>
        <div v-if="nodeHover.meta?.module" flex="~" font-semibold font-mono text-base mb2>
          <DisplayModuleId :id="nodeHover.meta.module" :cwd="root" :link="false" />
        </div>
        <div v-if="nodeHover.meta?.module" border="t base" pt2 flex="~ col gap-1.5" min-w-48>
          <div flex="~ justify-between items-center" py1>
            <label text-xs opacity-70>Start Time</label>
            <time
              :datetime="new Date(nodeHover.meta.timestamp_start).toISOString()"
              font-mono text="xs"
              bg="base/10"
              px1.5 py0.5 rounded
            >
              {{ normalizeTimestamp(nodeHover.meta.timestamp_start) }}
            </time>
          </div>
          <div flex="~ justify-between items-center" py1>
            <label text-xs opacity-70>End Time</label>
            <time
              :datetime="new Date(nodeHover.meta.timestamp_end).toISOString()"
              font-mono text="xs"
              bg="base/10"
              px1.5 py0.5 rounded
            >
              {{ normalizeTimestamp(nodeHover.meta.timestamp_end) }}
            </time>
          </div>
          <div flex="~ justify-between items-center" py1 border="t base dashed" pt2>
            <label text="xs" op70>Duration</label>
            <DisplayDuration :duration="nodeHover.meta.duration" />
          </div>
        </div>

        <div v-else>
          <DisplayDuration :duration="nodeHover.meta?.duration" />
        </div>
      </template>
    </div>
  </DisplayGraphHoverView>
</template>
