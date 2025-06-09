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
watchEffect(async () => {
  const arg = {
    session: props.session.id,
    module: props.module,
  }
  // fetch transforms in the next tick to avoid race conditions with module info
  nextTick(async () => {
    transforms.value = await rpc.value!['vite:rolldown:get-module-transforms']?.(arg)
  })
})

const info = computedAsync(async () => {
  const arg = {
    session: props.session.id,
    module: props.module,
  }
  return {
    ...(await rpc.value!['vite:rolldown:get-module-info']?.(arg)),
    transforms: transforms.value,
  } as ModuleInfo
})
</script>

<template>
  <div>
    <template v-if="info">
      <FlowmapModuleFlow
        p4
        :info
        :session
      />
      <ChartModuleFlamegraph
        :info
        :session="session"
      />
    </template>
    <div v-else>
      <!-- TODO: Better loading screen -->
      <div>Loading...</div>
    </div>
  </div>
</template>
