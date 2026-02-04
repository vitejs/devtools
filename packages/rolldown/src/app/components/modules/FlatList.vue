<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import DataVirtualList from '@vitejs/devtools-ui/components/DataVirtualList.vue'

withDefaults(defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
  disableTooltip?: boolean
  link?: boolean
}>(), {
  disableTooltip: false,
  link: true,
})

const emit = defineEmits<{
  (e: 'select', module: ModuleListItem): void
}>()
</script>

<template>
  <div flex="~ col gap-2" p4>
    <DataVirtualList
      :items="modules"
      key-prop="id"
    >
      <template #default="{ item }">
        <div flex pb2 @click="emit('select', item)">
          <DisplayModuleId
            :id="item.id"
            :session
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
