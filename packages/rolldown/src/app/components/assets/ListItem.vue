<script setup lang="ts">
import type { RolldownAssetInfo } from '~~/shared/types'

defineProps<{
  asset: RolldownAssetInfo
}>()
</script>

<template>
  <NuxtLink
    :to="{ query: { asset: asset.filename } }"
    w-full font-mono border="~ rounded base" px2 py1 text-sm hover="bg-active"
  >
    <div flex="~ gap-1">
      <DisplayFileIcon :filename="asset.filename" />
      <span overflow-hidden text-ellipsis break-all line-clamp-2>
        {{ asset.filename }}
        <span op50>
          ({{ asset.chunk?.name?.replace(/[\[\]]/g, '') }})
        </span>
      </span>
    </div>
  </NuxtLink>
</template>
