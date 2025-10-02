<script setup lang="ts">
import type { Asset as AssetInfo } from '@rolldown/debug'

defineProps<{
  assets: AssetInfo[]
}>()
</script>

<template>
  <div p4>
    <DataVirtualList
      :items="assets"
      key-prop="filename"
    >
      <template #default="{ item }">
        <div flex pb2>
          <AssetsListItem :asset="item" />
        </div>
      </template>
    </DataVirtualList>
  </div>
</template>
