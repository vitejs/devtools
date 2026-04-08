<script setup lang="ts">
import { useRpc } from '#imports'
import { onMounted, shallowRef } from 'vue'
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
