<script setup lang="ts">
import type { ModuleInfo, RolldownModuleTransformInfo, SessionContext } from '~~/shared/types'
import DisplayCloseButton from '@vitejs/devtools-ui/components/Display/DisplayCloseButton.vue'
import { computedAsync } from '@vueuse/core'
import { nextTick, ref, watchEffect } from 'vue'
import { settings } from '~~/app/state/settings'
import { useRpc } from '#imports'

const props = defineProps<{
  session: SessionContext
  module: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const rpc = useRpc()
const transforms = ref<RolldownModuleTransformInfo[]>([])
const transformsLoading = ref(false)
const flowNodeSelected = ref(false)

watchEffect(async () => {
  const arg = {
    session: props.session.id,
    module: props.module,
  }
  // fetch transforms in the next tick to avoid race conditions with module info
  nextTick(async () => {
    transforms.value = []
    transformsLoading.value = true
    transforms.value = await rpc.value.call(
      'vite:rolldown:get-module-transforms',
      arg,
    )
    transformsLoading.value = false
  })
})

const info = computedAsync(async () => {
  const arg = {
    session: props.session.id,
    module: props.module,
  }
  return {
    transforms: transforms.value,
    ...(await rpc.value.call(
      'vite:rolldown:get-module-info',
      arg,
    )),
  } as ModuleInfo
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
      <DisplayModuleId :id="module" class="px2 pt1" :session />
      <div class="text-xs font-mono flex items-center gap-3 ml2">
        <ModulesBuildMetrics v-if="info" :metrics="info.build_metrics" />
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
        :info
        :session
        :transforms-loading
        @select="selectFlowNode"
      />
      <ChartModuleFlamegraph
        v-if="settings.moduleDetailsViewType === 'charts'"
        :info
        :session="session"
        :flow-node-selected="flowNodeSelected"
      />
      <DataModuleImportRelationships
        v-if="settings.moduleDetailsViewType === 'imports'"
        :module="info"
        :session="session"
      />
    </div>
  </div>
  <VisualLoading v-else />
</template>
