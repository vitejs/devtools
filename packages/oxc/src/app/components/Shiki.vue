<script setup lang="ts">
import { shallowRef, watchEffect } from 'vue'
import { servicesRevision, useRpc } from '~/composables/rpc'

const props = defineProps<{
  code: string
  ext: string
}>()

function getLang(ext: string) {
  switch (ext) {
    case '.css':
      return 'css'
    case '.js':
      return 'javascript'
    case '.mjs':
      return 'javascript'
    case '.cjs':
      return 'javascript'
    case '.jsx':
      return 'javascript'
    case '.mts':
      return 'typescript'
    case '.cts':
      return 'typescript'
    case '.ts':
      return 'typescript'
    case '.tsx':
      return 'typescript'
    case '.json':
      return 'json'
    case '.json5':
      return 'json5'
    case '.jsonc':
      return 'jsonc'
    case '.md':
      return 'markdown'
    case '.mdx':
      return 'mdx'
    default:
      return 'javascript'
  }
}

const rpc = useRpc()
const html = shallowRef<string>()

watchEffect(async onCleanup => {
  let stale = false
  onCleanup(() => {
    stale = true
  })
  html.value = undefined
  void servicesRevision.value
  const shiki = rpc.value?.services.get('@devframes/service-shiki')
  if (!shiki) return
  try {
    const result = await shiki.rpc.call('highlight', {
      code: props.code,
      lang: getLang(props.ext),
    })
    if (!stale) html.value = result.html
  } catch {
    // Keep the plain code readable if highlighting fails.
  }
})
</script>

<template>
  <div v-if="html" v-html="html" />
  <pre v-else class="shiki"><code>{{ props.code }}</code></pre>
</template>
