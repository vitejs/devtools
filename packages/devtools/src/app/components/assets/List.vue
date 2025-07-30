<script setup lang="ts">
import type { Asset as AssetInfo } from '@rolldown/debug'

defineProps<{
  assets: AssetInfo[]
}>()
</script>

<template>
  <div p4>
    <div flex="~ col gap-2">
      <AssetsListItem
        v-for="asset in assets"
        :key="asset.filename"
        :asset="asset"
      />
    </div>
  </div>
</template>
