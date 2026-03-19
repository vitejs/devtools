<script setup lang="ts">
import { useRpc } from '#imports'
import { onMounted, shallowRef } from 'vue'
import { useRefreshProvider } from '../composables/refresh'

interface RpcFunctionInfo {
  name: string
  type: string
  cacheable: boolean
  hasArgs: boolean
  hasReturns: boolean
  hasDump: boolean
  hasSetup: boolean
  hasHandler: boolean
}

const rpc = useRpc()
const data = shallowRef<RpcFunctionInfo[]>()

async function fetchData() {
  data.value = await rpc.value.call('devtoolskit:self-inspect:get-rpc-functions')
}

useRefreshProvider(fetchData)
onMounted(fetchData)
</script>

<template>
  <VisualLoading v-if="!data" />
  <RpcFunctionsList v-else :functions="data" />
</template>
