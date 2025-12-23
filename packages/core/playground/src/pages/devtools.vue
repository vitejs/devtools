<script setup lang="ts">
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { onMounted, shallowRef } from 'vue'

const stateRef = shallowRef<any>(undefined)
const isTrustedRef = shallowRef<boolean | null>(null)

onMounted(async () => {
  const client = await getDevToolsRpcClient()
  isTrustedRef.value = client.isTrusted
  const state = await client.sharedState.get('counter')

  client.events.on('rpc:is-trusted:updated', (isTrusted) => {
    isTrustedRef.value = isTrusted
  })

  stateRef.value = state.value()
  state.on('updated', (newState) => {
    console.log('updated', newState)
    stateRef.value = newState
  })
})
</script>

<template>
  <div>
    <h1>DevTools </h1>
    <div>{{ isTrustedRef }}</div>
    <pre>{{ stateRef }}</pre>
  </div>
</template>
