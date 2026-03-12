<script setup lang="ts">
import type { DevtoolsPluginInfo } from '~~/types'
import { useRpc } from '#imports'
import { onMounted, shallowRef } from 'vue'
import { useRefreshProvider } from '../composables/refresh'

const rpc = useRpc()
const data = shallowRef<DevtoolsPluginInfo[]>()

async function fetchData() {
  data.value = await rpc.value.call('devtoolskit:self-inspect:get-devtools-plugins')
}

useRefreshProvider(fetchData)
onMounted(fetchData)
</script>

<template>
  <div v-if="!data" flex="~ items-center justify-center" h-full op50>
    Loading...
  </div>
  <DevtoolsPluginsList v-else :plugins="data" />
</template>
