<script setup lang="ts" generic="T extends { id: string, imports: unknown[] }">
import type { GraphPathSelector } from '../../composables/graph-path-selector'
import { hideAllPoppers, Menu as VMenu } from 'floating-vue'

withDefaults(
  defineProps<{
    selector: GraphPathSelector<T>
    placeholder: string
    data?: T[]
    emptyStateText?: string
    onClear?: () => void
  }>(),
  {
    data: undefined,
    emptyStateText: undefined,
    onClear: undefined,
  },
)

const emit = defineEmits<{
  (e: 'clear'): void
}>()

defineSlots<{
  list: () => void
  item: () => void
  empty: () => void
}>()

const search = defineModel<string>('search', { required: true })
</script>

<template>
  <div class="flex-1 w-0 h-full">
    <div v-if="selector.state.value.selected" class="w-full overflow-hidden flex items-center border border-base rounded p1 relative">
      <div class="overflow-hidden text-ellipsis pr6 w-0 flex-1">
        <slot name="item" />
      </div>
      <button class="i-carbon-clean text-4 hover:op100 op50 absolute right-2" title="Clear" @click="emit('clear')" />
    </div>
    <VMenu v-else :distance="15" :triggers="['click']" :auto-hide="false" :delay="{ show: 300, hide: 150 }" class="h-full">
      <input
        v-model="search"
        class="py1 px4 w-full h-full border border-base rounded-1" style="outline: none" :placeholder="placeholder"
        @blur="hideAllPoppers"
      >
      <template #popper>
        <div class="p2 w100 flex flex-col gap2">
          <slot v-if="data?.length" name="list" />
          <slot v-else name="empty" />
        </div>
      </template>
    </VMenu>
  </div>
</template>
