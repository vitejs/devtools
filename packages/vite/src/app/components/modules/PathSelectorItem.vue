<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import type { ModulePathSelector } from '~/composables/moduleGraph'
import { hideAllPoppers, Menu as VMenu } from 'floating-vue'

withDefaults(
  defineProps<{
    selector: ModulePathSelector
    placeholder: string
    session: SessionContext
    modules?: ModuleListItem[]
    emptyStateText?: string
    onClear?: () => void
  }>(),
  {
    modules: undefined,
    emptyStateText: undefined,
    onClear: undefined,
  },
)

const emit = defineEmits<{
  (e: 'clear'): void
}>()

const search = defineModel<string>('search', { required: true })
</script>

<template>
  <div flex-1 w-0>
    <div v-if="selector.state.value.selected" w-full overflow-hidden flex="~ items-center" border="~ base rounded" p1 relative>
      <div overflow-hidden text-ellipsis pr6 py0.5 w-0 flex-1>
        <DisplayModuleId
          :id="selector.state.value.selected"
          :session="session"
          block text-nowrap
          :link="false"
          :disable-tooltip="true"
        />
      </div>
      <button i-carbon-clean text-4 hover="op100" op50 title="Clear" absolute right-2 @click="emit('clear')" />
    </div>
    <VMenu v-else :distance="15" :triggers="['click']" :auto-hide="false" :delay="{ show: 300, hide: 150 }">
      <input
        v-model="search"
        p1
        px4 w-full border="~ base rounded-1" style="outline: none" :placeholder="placeholder"
        @blur="hideAllPoppers"
      >
      <template #popper>
        <div class="p2 w100" flex="~ col gap2">
          <ModulesFlatList
            v-if="modules?.length"
            :session="session"
            :modules="modules"
            disable-tooltip
            :link="false"
            @select="selector.select"
          />
          <slot v-else name="empty" />
        </div>
      </template>
    </VMenu>
  </div>
</template>
