<script setup lang="ts">
import type { RolldownAssetInfo } from '~~/shared/types'
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'

defineProps<{
  asset: RolldownAssetInfo
}>()
</script>

<template>
  <div flex="~ gap-2 items-center">
    <div i-catppuccin-java-class-abstract />
    <div>{{ asset.filename }}</div>
    <DisplayFileSizeBadge :bytes="asset.size" text-sm />
    <DisplayBadge :text="asset.type" />
  </div>
</template>
