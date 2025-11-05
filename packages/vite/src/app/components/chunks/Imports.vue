<script lang="ts" setup>
import type { RolldownChunkImport } from '~~/shared/types/data'

defineProps<{
  imports: RolldownChunkImport[]
}>()
</script>

<template>
  <DisplayExpandableContainer flex="~ col gap-1" mt2 ws-nowrap :list="imports">
    <template #default="{ items }">
      <template v-for="(chunk, index) in items" :key="index">
        <ChunksBaseInfo v-if="chunk" :chunk="chunk" link hover="bg-active" border="~ base rounded" px2 py1 w-full>
          <template #icon>
            <div v-if="chunk.kind === 'import-statement'" i-ph-file-duotone />
            <div v-if="chunk.kind === 'dynamic-import'" i-ph-lightning-duotone />
          </template>
          <template #left-after>
            <DisplayBadge :text="chunk.kind" />
          </template>
        </ChunksBaseInfo>
      </template>
    </template>
  </DisplayExpandableContainer>
</template>
