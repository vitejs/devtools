<script lang="ts" setup>
import type { RolldownChunkImport } from '~~/shared/types/data'
import { useRoute } from '#app/composables/router'

const { chunk } = defineProps<{
  chunk: RolldownChunkImport
}>()

const route = useRoute()
</script>

<template>
  <!-- <VisualLoading /> -->
  <NuxtLink v-if="chunk" flex="~ items-center" :to="{ path: route.path, query: { chunk: chunk.chunk_id } }">
    <!-- Icon, Name, Reason -->
    <div flex="~ gap-2 items-center" :title="`Chunk #${chunk.chunk_id}`">
      <div v-if="chunk.kind === 'import-statement'" i-ph-file-duotone />
      <div v-if="chunk.kind === 'dynamic-import'" i-ph-lightning-duotone />
      <div>{{ chunk.name || '[unnamed]' }}</div>
      <DisplayBadge :text="chunk.reason" />

      <!-- Import Kind -->
      <DisplayBadge :text="chunk.kind" />
    </div>

    <div flex-auto />

    <div text-sm flex="~ items-center gap-2">
      <span op50 font-mono>#{{ chunk.chunk_id }}</span>
      <div flex="~ gap-1 items-center">
        <div i-ph-file-arrow-up-duotone />
        {{ chunk.imports }}
      </div>
      <div flex="~ gap-1 items-center">
        <div i-ph-package-duotone />
        {{ chunk.modules }}
      </div>
    </div>
  </NuxtLink>
</template>
