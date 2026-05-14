<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { useRpc } from '#imports'
import { useRefreshProvider } from '../composables/refresh'

const rpc = useRpc()
const keys = shallowRef<string[]>()

async function fetchData() {
  keys.value = await rpc.value.call('devtoolskit:self-inspect:get-shared-state-keys')
}

useRefreshProvider(fetchData)
onMounted(fetchData)
</script>

<template>
  <VisualLoading v-if="!keys" />
  <SharedStateView v-else :keys="keys" />
</template>
