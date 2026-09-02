<script setup lang="ts" generic="T extends { plugin_id: string | number, name: string }">
import { useRoute } from '#app/composables/router'
import { NuxtLink } from '#components'
import DataVirtualList from '../Data/DataVirtualList.vue'
import DisplayPluginName from '../Display/DisplayPluginName.vue'

withDefaults(defineProps<{
  plugins: T[]
  itemSize?: number
  pageMode?: boolean
  scroller?: 'dynamic' | 'window'
}>(), {
  pageMode: true,
  scroller: 'dynamic',
})

const route = useRoute()
</script>

<template>
  <div class="flex flex-col gap-2 p4">
    <DataVirtualList
      :items="plugins"
      key-prop="plugin_id"
      :item-size="itemSize"
      :page-mode="pageMode"
      :scroller="scroller"
    >
      <template #default="{ item }">
        <div class="flex pb2">
          <NuxtLink :to="{ path: route.path, query: { plugin: item.plugin_id } }" class="font-mono border rounded border-base w-full px2 py1 text-sm hover:bg-active flex gap-4 items-center">
            <div class="w-8 text-right text-xs op50">
              #{{ item.plugin_id }}
            </div>
            <span class="overflow-hidden text-ellipsis break-all line-clamp-2">
              <DisplayPluginName :name="item.name" />
            </span>
          </NuxtLink>
        </div>
      </template>
    </DataVirtualList>
  </div>
</template>
