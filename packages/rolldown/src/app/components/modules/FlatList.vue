<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import DataVirtualList from '@vitejs/devtools-ui/components/Data/DataVirtualList.vue'

withDefaults(defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
  disableTooltip?: boolean
  link?: boolean
  itemSize?: number
  pageMode?: boolean
  scroller?: 'dynamic' | 'window'
}>(), {
  disableTooltip: false,
  link: true,
  pageMode: true,
  scroller: 'dynamic',
})

const emit = defineEmits<{
  (e: 'select', module: ModuleListItem): void
}>()
</script>

<template>
  <div class="flex flex-col gap-2 p4">
    <DataVirtualList
      :items="modules"
      key-prop="id"
      :item-size="itemSize"
      :page-mode="pageMode"
      :scroller="scroller"
    >
      <template #default="{ item }">
        <div class="flex pb2" @click="emit('select', item)">
          <DisplayModuleId
            :id="item.id"
            :session
            class="hover:bg-active block px2 p1 w-full border border-base rounded"
            :link="link"
            :disable-tooltip="disableTooltip"
          />
        </div>
      </template>
    </DataVirtualList>
  </div>
</template>
