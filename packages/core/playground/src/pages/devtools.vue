<script setup lang="ts">
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { onMounted, shallowRef } from 'vue'

const stateRef = shallowRef<any>(undefined)

onMounted(async () => {
  const client = await getDevToolsRpcClient()
  const state = await client.sharedState.get('counter')

  stateRef.value = state.get()
  state.on('updated', () => {
    stateRef.value = state.get()
  })
})
</script>

<template>
  <div>
    <h1>DevTools {{ stateRef }}</h1>
  </div>
</template>
