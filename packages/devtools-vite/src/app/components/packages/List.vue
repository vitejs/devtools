<script setup lang="ts">
import type { PackageInfo } from '~~/shared/types'

defineProps<{
  packages: PackageInfo[]
}>()
</script>

<template>
  <div p4>
    <DataVirtualList
      :items="packages"
      key-prop="name"
    >
      <template #default="{ item }">
        <div flex pb2>
          <PackagesListItem :package="item" />
        </div>
      </template>
    </DataVirtualList>
  </div>
</template>
