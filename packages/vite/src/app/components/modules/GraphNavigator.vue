<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import { hideAllPoppers, Menu as VMenu } from 'floating-vue'

defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function selectNode(node: ModuleListItem) {
  return node
}
</script>

<template>
  <div h12 px4 p2 relative flex="~ gap2 items-center">
    <VMenu inline :distance="15" :triggers="['click']" :auto-hide="false" :delay="{ show: 200, hide: 0 }">
      <input
        p1 px4 border="~ base rounded-1" style="outline: none"
        placeholder="Start"
        @blur="hideAllPoppers"
      >
      <template #popper>
        <div class="p2 w100" flex="~ col gap2">
          <ModulesFlatList
            :session="session"
            :modules="modules"
            disable-tooltip
            :link="false"
            @select="selectNode"
          />
        </div>
      </template>
    </VMenu>
    <div class="i-carbon-arrow-right op50" />
    <VMenu inline :distance="15" :triggers="['click']" :auto-hide="false" :delay="{ show: 200, hide: 0 }">
      <input
        p1 px4 border="~ base rounded-1" style="outline: none"
        placeholder="End"
        @blur="hideAllPoppers"
      >
      <template #popper>
        <div class="p2 w100" flex="~ col gap2">
          <ModulesFlatList
            :session="session"
            :modules="modules"
            disable-tooltip
            :link="false"
            @select="selectNode"
          />
        </div>
      </template>
    </VMenu>

    <DisplayCloseButton class="absolute right-2" @click="emit('close')" />
  </div>
</template>
