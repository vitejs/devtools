<script setup lang="ts">
import type { RolldownAssetInfo } from '~~/shared/types'
import DataVirtualList from '@vitejs/devtools-ui/components/Data/DataVirtualList.vue'

withDefaults(defineProps<{
  assets: RolldownAssetInfo[]
  itemSize?: number
  pageMode?: boolean
  scroller?: 'dynamic' | 'window'
}>(), {
  itemSize: 40,
  pageMode: true,
  scroller: 'window',
})
</script>

<template>
  <div class="p4">
    <DataVirtualList
      :items="assets"
      key-prop="filename"
      :item-size="itemSize"
      :page-mode="pageMode"
      :scroller="scroller"
    >
      <template #default="{ item }">
        <div class="h-10 flex">
          <AssetsListItem :asset="item" />
        </div>
      </template>
    </DataVirtualList>
  </div>
</template>
