<script setup lang="ts">
import type { RolldownAssetInfo } from '~~/shared/types'
import DataVirtualList from '@vitejs/devtools-ui/components/DataVirtualList.vue'

defineProps<{
  assets: RolldownAssetInfo[]
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
