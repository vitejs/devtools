<script setup lang="ts">
import { useRpc } from '#imports'
import { onMounted, shallowRef } from 'vue'
import { useRefreshProvider } from '../composables/refresh'

interface AuthToken {
  authId: string
  ua: string
  origin: string
  timestamp: number
}

const rpc = useRpc()
const data = shallowRef<AuthToken[]>()

async function fetchData() {
  data.value = await rpc.value.call('devtoolskit:self-inspect:get-auth-tokens')
}

async function revoke(authId: string) {
  await rpc.value.call('devtoolskit:self-inspect:revoke-auth-token', authId)
  await fetchData()
}

useRefreshProvider(fetchData)
onMounted(fetchData)
</script>

<template>
  <VisualLoading v-if="!data" />
  <AuthTokensList v-else :tokens="data" @revoke="revoke" />
</template>
