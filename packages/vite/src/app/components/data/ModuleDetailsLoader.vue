<script setup lang="ts">
import type { DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import type { InspectModuleUpdatedPayload } from '~/composables/rpc'
import type { ViteModuleListItem } from '~/types/modules'
import DisplayCloseButton from '@vitejs/devtools-ui/components/Display/DisplayCloseButton.vue'
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRpc } from '#imports'
import { onInspectModuleUpdated } from '~/composables/rpc'
import { settings } from '~/state/settings'

type InspectQuery = Parameters<DevToolsRpcServerFunctions['vite:inspect:get-module-transform-info']>[0]
type TransformInfo = Awaited<ReturnType<DevToolsRpcServerFunctions['vite:inspect:get-module-transform-info']>>

const props = defineProps<{
  query: InspectQuery
  module: string
  modules: ViteModuleListItem[]
  root: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const rpc = useRpc()
const transformInfo = ref<TransformInfo>()
const transformsLoading = ref(false)
const flowNodeSelected = ref(false)

const info = computed(() => props.modules.find(item => item.id === props.module))

let transformRequestVersion = 0

async function loadTransformInfo() {
  const query = props.query
  const moduleId = props.module

  const requestVersion = ++transformRequestVersion
  transformsLoading.value = true
  try {
    const result = await rpc.value.call('vite:inspect:get-module-transform-info', query, moduleId)
    if (requestVersion === transformRequestVersion)
      transformInfo.value = result
  }
  finally {
    if (requestVersion === transformRequestVersion)
      transformsLoading.value = false
  }
}

const reloadTransformInfo = useDebounceFn((payload: InspectModuleUpdatedPayload = {}) => {
  if (!payload.ids || payload.ids.includes(props.module))
    loadTransformInfo()
}, 100)

watch(
  () => [props.query.vite, props.query.env, props.module],
  () => {
    loadTransformInfo()
  },
  { immediate: true },
)

onInspectModuleUpdated((payload) => {
  reloadTransformInfo(payload)
})

function selectFlowNode(v: boolean) {
  flowNodeSelected.value = v
}
</script>

<template>
  <div v-if="info" class="relative h-full w-full">
    <DisplayCloseButton
      class="absolute right-2 top-1.5 bg-glass z-panel-content"
      @click="emit('close')"
    />
    <div
      class="bg-glass absolute left-2 top-2 z-panel-content p2 border border-base rounded-lg flex flex-col gap-2"
    >
      <DisplayModuleId :id="module" class="px2 pt1" :cwd="root" />
      <div class="text-xs font-mono flex items-center gap-3 ml2">
        <ModulesBuildMetrics v-if="info.buildMetrics" :metrics="info.buildMetrics" />
      </div>
      <div class="flex gap-2">
        <button
          :class="settings.moduleDetailsViewType === 'flow' ? 'text-primary' : ''"
          class="flex gap-2 items-center justify-center px2 py1 w-40 border border-base rounded-lg hover:bg-active"
          @click="settings.moduleDetailsViewType = 'flow'"
        >
          <div class="i-ph-git-branch-duotone rotate-180" />
          Build Flow
        </button>
        <button
          :class="settings.moduleDetailsViewType === 'charts' ? 'text-primary' : ''"
          class="flex gap-2 items-center justify-center px2 py1 w-40 border border-base rounded-lg hover:bg-active"
          @click="settings.moduleDetailsViewType = 'charts'"
        >
          <div class="i-ph-chart-donut-duotone" />
          Charts
        </button>
        <button
          :class="settings.moduleDetailsViewType === 'imports' ? 'text-primary' : ''"
          class="flex gap-2 items-center justify-center px2 py1 w-40 border border-base rounded-lg hover:bg-active"
          @click="settings.moduleDetailsViewType = 'imports'"
        >
          <div class="i-ph-graph-duotone" />
          Imports
        </button>
      </div>
    </div>
    <div class="of-auto h-full pt-30">
      <FlowmapModuleFlow
        v-if="settings.moduleDetailsViewType === 'flow'"
        :module="info"
        :modules="modules"
        :root="root"
        :transforms="transformInfo?.transforms || []"
        :resolved-id="transformInfo?.resolvedId"
        :transforms-loading="transformsLoading"
        @select="selectFlowNode"
      />
      <ChartModuleFlamegraph
        v-if="settings.moduleDetailsViewType === 'charts'"
        :module="info"
        :transforms="transformInfo?.transforms || []"
        :flow-node-selected="flowNodeSelected"
      />
      <DataModuleImportRelationships
        v-if="settings.moduleDetailsViewType === 'imports'"
        :module="info"
        :modules="modules"
        :root="root"
      />
    </div>
  </div>
  <VisualLoading v-else />
</template>
