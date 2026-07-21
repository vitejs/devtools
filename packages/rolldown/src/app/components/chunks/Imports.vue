<script lang="ts" setup>
import type { RolldownChunkImport } from '~~/shared/types/data'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'

defineProps<{
  imports: RolldownChunkImport[]
}>()
</script>

<template>
  <DisplayExpandableContainer class="flex flex-col gap-1 mt2 ws-nowrap" :list="imports">
    <template #default="{ items }">
      <template v-for="(chunk, index) in items" :key="index">
        <ChunksBaseInfo v-if="chunk" :chunk="chunk" link class="hover:bg-active border border-base rounded px2 py1 w-full">
          <template #icon>
            <div v-if="chunk.kind === 'import-statement'" class="i-ph-file-duotone" />
            <div v-if="chunk.kind === 'dynamic-import'" class="i-ph-lightning-duotone" />
          </template>
          <template #left-after>
            <DisplayBadge :text="chunk.kind" />
          </template>
        </ChunksBaseInfo>
      </template>
    </template>
  </DisplayExpandableContainer>
</template>
