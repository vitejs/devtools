<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'

defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
}>()
</script>

<template>
  <div flex="~ col gap-2" p4>
    <DataVirtualList
      :items="modules"
      key-prop="id"
    >
      <template #default="{ item }">
        <div flex pb2>
          <DisplayModuleId
            :id="item.id"
            :session
            hover="bg-active" block px2 p1 w-full
            border="~ base rounded"
            :link="true"
          />
        </div>
      </template>
    </DataVirtualList>
  </div>
</template>
