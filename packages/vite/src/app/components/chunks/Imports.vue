<script lang="ts" setup>
import type { RolldownChunkImport } from '~~/shared/types/data'

defineProps<{
  imports: RolldownChunkImport[]
}>()
</script>

<template>
  <div flex="~ col gap-1" mt2 ws-nowrap>
    <ChunksImportItem
      v-for="(chunk, index) in imports"
      :key="index"
      :chunk="chunk"
      hover="bg-active"
      border="~ base rounded" px2 py1 w-full
    />
  </div>
</template>
