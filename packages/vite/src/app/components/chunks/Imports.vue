<script lang="ts" setup>
import type { RolldownChunkImport } from '~~/shared/types/data'

defineProps<{
  imports: RolldownChunkImport[]
}>()
</script>

<template>
  <DisplayExpandableContainer flex="~ col gap-1" mt2 ws-nowrap :list="imports">
    <template #default="{ items }">
      <ChunksImportItem
        v-for="(chunk, index) in items"
        :key="index"
        :chunk="chunk"
        hover="bg-active"
        border="~ base rounded" px2 py1 w-full
      />
    </template>
  </DisplayExpandableContainer>
</template>
