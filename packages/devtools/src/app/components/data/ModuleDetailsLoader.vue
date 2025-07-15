<script setup lang="ts">
import type { ModuleInfo, RolldownModuleTransformInfo, SessionContext } from '~~/shared/types'
import { useRpc } from '#imports'
import { computedAsync } from '@vueuse/core'
import { nextTick, ref, watchEffect } from 'vue'

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
const view = ref<'flow' | 'charts' | 'imports'>('flow')

watchEffect(async () => {
  const arg = {
    session: props.session.id,
    module: props.module,
  }
  // fetch transforms in the next tick to avoid race conditions with module info
  nextTick(async () => {
    transforms.value = []
    transformsLoading.value = true
    transforms.value = await rpc.value!['vite:rolldown:get-module-transforms']?.(arg)
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
    ...(await rpc.value!['vite:rolldown:get-module-info']?.(arg)),
  } as ModuleInfo
})

function selectFlowNode(v: boolean) {
  flowNodeSelected.value = v
}
</script>

<template>
  <div v-if="info" relative h-full w-full>
    <DisplayCloseButton
      absolute right-2 top-1.5 bg-glass z-panel-content
      @click="emit('close')"
    />
    <div
      bg-glass absolute left-2 top-2 z-panel-content p2
      border="~ base rounded-lg"
      flex="~ col gap-2"
    >
      <DisplayModuleId :id="module" px2 py1 :session />
      <div flex="~ gap-2">
        <button
          :class="view === 'flow' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="view = 'flow'"
        >
          <div i-ph-git-branch-duotone rotate-180 />
          Build Flow
        </button>
        <button
          :class="view === 'charts' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="view = 'charts'"
        >
          <div i-ph-chart-donut-duotone />
          Charts
        </button>
        <button
          :class="view === 'imports' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="view = 'imports'"
        >
          <div i-ph-graph-duotone />
          Imports
        </button>
      </div>
    </div>
    <div of-auto h-full pt-30>
      <FlowmapModuleFlow
        v-if="view === 'flow'"
        p4
        :info
        :session
        :transforms-loading
        @select="selectFlowNode"
      />
      <ChartModuleFlamegraph
        v-if="view === 'charts'"
        :info
        :session="session"
        :flow-node-selected="flowNodeSelected"
      />
      <DataModuleImportRelationships
        v-if="view === 'imports'"
        :module="info"
        :session="session"
      />
    </div>
  </div>
  <VisualLoading v-else />
</template>
