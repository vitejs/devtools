<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { useRpc } from '#imports'
import { onMounted, shallowRef } from 'vue'
import { useRefreshProvider } from '../composables/refresh'

const rpc = useRpc()
const data = shallowRef<DevToolsDockEntry[]>()

async function fetchData() {
  data.value = await rpc.value.call('devtoolskit:self-inspect:get-docks')
}

useRefreshProvider(fetchData)
onMounted(fetchData)
</script>

<template>
  <div v-if="!data" flex="~ items-center justify-center" h-full op50>
    Loading...
  </div>
  <DocksList v-else :docks="data" />
</template>
