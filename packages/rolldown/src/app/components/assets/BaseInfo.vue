<script setup lang="ts">
import type { RolldownAssetInfo } from '~~/shared/types'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'

defineProps<{
  asset: RolldownAssetInfo
}>()
</script>

<template>
  <div class="flex gap-2 items-center">
    <div class="i-catppuccin-java-class-abstract" />
    <div>{{ asset.filename }}</div>
    <DisplayFileSizeBadge :bytes="asset.size" class="text-sm" />
    <DisplayBadge :text="asset.type" />
  </div>
</template>
