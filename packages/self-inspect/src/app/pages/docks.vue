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
  <VisualLoading v-if="!data" />
  <DocksList v-else :docks="data" />
</template>
