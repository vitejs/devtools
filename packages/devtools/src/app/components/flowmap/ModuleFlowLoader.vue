<script setup lang="ts">
import type { ModuleInfo, RolldownModuleTransformInfo, SessionContext } from '~~/shared/types'
import { useRpc } from '#imports'
import { computedAsync } from '@vueuse/core'
import { nextTick, ref, watchEffect } from 'vue'

const props = defineProps<{
  session: SessionContext
  module: string
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
  <div of-auto w-full h-full relative>
    <div v-if="info" flex="~ col" w-full min-w-full>
      <FlowmapModuleFlow
        p4
        :info
        :session
        :transforms-loading
        @select="selectFlowNode"
      />
      <ChartModuleFlamegraph
        :info
        :session="session"
        :flow-node-selected="flowNodeSelected"
      />
    </div>
    <VisualLoading v-else />
  </div>
</template>
