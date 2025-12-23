<script setup lang="ts">
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { onMounted, shallowRef } from 'vue'

const stateRef = shallowRef<any>(undefined)
const isTrustedRef = shallowRef<boolean | null>(null)

let increment = () => {}

onMounted(async () => {
  const client = await getDevToolsRpcClient()

  isTrustedRef.value = client.isTrusted
  client.events.on('rpc:is-trusted:updated', (isTrusted) => {
    isTrustedRef.value = isTrusted
  })

  const state = await client.sharedState.get<{ count: number }>('counter')

  increment = () => {
    state.mutate((state) => {
      state.count++
    })
  }

  stateRef.value = state.value()
  state.on('updated', (newState) => {
    stateRef.value = newState
  })
})
</script>

<template>
  <div>
    <h1>DevTools </h1>
    <div>{{ isTrustedRef }}</div>
    <pre>{{ stateRef }}</pre>
    <button @click="increment">
      Increment
    </button>
  </div>
</template>
