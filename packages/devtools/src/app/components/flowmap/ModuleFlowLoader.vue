<script setup lang="ts">
import type { ModuleInfo, RolldownModuleTransformInfo, SessionContext } from '~~/shared/types'
import { computedAsync } from '@vueuse/core'
import { ref, watchEffect } from 'vue'
import { backend } from '~/state/backend'

const props = defineProps<{
  session: SessionContext
  module: string
}>()

const transforms = ref<RolldownModuleTransformInfo[]>([])
watchEffect(async () => {
  const arg = {
    session: props.session.id,
    module: props.module,
  }
  transforms.value = await backend.value!.functions['vite:rolldown:get-module-transforms']?.(arg)
})

const info = computedAsync(async () => {
  const arg = {
    session: props.session.id,
    module: props.module,
  }
  return {
    ...(await backend.value!.functions['vite:rolldown:get-module-info']?.(arg)),
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
