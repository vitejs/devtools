<script setup lang="ts">
import type { ViteModuleListItem } from '~/types/modules'
import DataVirtualList from '@vitejs/devtools-ui/components/DataVirtualList.vue'

withDefaults(defineProps<{
  root: string
  modules: ViteModuleListItem[]
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
  (e: 'select', module: ViteModuleListItem): void
}>()
</script>

<template>
  <div flex="~ col gap-2" p4>
    <DataVirtualList
      :items="modules"
      key-prop="id"
      :item-size="itemSize"
      :page-mode="pageMode"
      :scroller="scroller"
    >
      <template #default="{ item }">
        <div flex pb2 @click="emit('select', item)">
          <DisplayModuleId
            :id="item.id"
            :cwd="root"
            hover="bg-active" block px2 p1 w-full
            border="~ base rounded"
            :link="link"
            :disable-tooltip="disableTooltip"
          />
        </div>
      </template>
    </DataVirtualList>
  </div>
</template>
