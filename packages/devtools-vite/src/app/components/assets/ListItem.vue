<script setup lang="ts">
import type { Asset as AssetInfo } from '@rolldown/debug'

defineProps<{
  asset: AssetInfo
}>()
</script>

<template>
  <NuxtLink
    :to="{ query: { asset: asset.filename } }"
    font-mono border="~ rounded base" px2 py1 text-sm hover="bg-active"
  >
    <div flex="~ gap-1">
      <DisplayFileIcon :filename="asset.filename" />
      <span overflow-hidden text-ellipsis break-all line-clamp-2>
        {{ asset.filename }}
      </span>
    </div>
  </NuxtLink>
</template>
