<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'

defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
}>()
</script>

<template>
  <div flex="~ col gap-2" p4>
    <template v-for="mod of modules" :key="mod">
      <DisplayModuleId
        :id="mod.id"
        :session
        hover="bg-active" block px2 p1
        border="~ base rounded"
        :link="true"
      />
    </template>
  </div>
</template>
