<script setup lang="ts">
import type { RolldownAssetInfo } from '~~/shared/types'

defineProps<{
  asset: RolldownAssetInfo
}>()
</script>

<template>
  <NuxtLink
    :to="{ query: { asset: asset.filename } }"
    block h-8 w-full min-w-0 overflow-hidden font-mono border="~ rounded base" px2 py1 text-sm hover="bg-active"
  >
    <div h-full min-w-0 flex="~ gap-1 items-center">
      <DisplayFileIcon :filename="asset.filename" flex-none />
      <span min-w-0 overflow-hidden text-ellipsis whitespace-nowrap>
        {{ asset.filename }}
        <span op50>
          ({{ asset.chunk?.name?.replace(/[\[\]]/g, '') }})
        </span>
      </span>
    </div>
  </NuxtLink>
</template>
