<script setup lang="ts">
import type { ClientScriptInfo } from '~~/types'
import { useRpc } from '#imports'
import { onMounted, shallowRef } from 'vue'
import { useRefreshProvider } from '../composables/refresh'

const rpc = useRpc()
const data = shallowRef<ClientScriptInfo[]>()

async function fetchData() {
  data.value = await rpc.value.call('devtoolskit:self-inspect:get-client-scripts')
}

useRefreshProvider(fetchData)
onMounted(fetchData)
</script>

<template>
  <div v-if="!data" flex="~ items-center justify-center" h-full op50>
    Loading...
  </div>
  <ClientScriptsList v-else :scripts="data" />
</template>
