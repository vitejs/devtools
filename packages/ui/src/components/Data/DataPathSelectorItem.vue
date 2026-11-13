<script setup lang="ts" generic="T extends { id: string, imports: unknown[] }">
import type { GraphPathSelector } from '../../composables/graph-path-selector'
import { Menu as VMenu } from 'floating-vue'
import { nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/index.css'

const props = defineProps<{
  selector: GraphPathSelector<T>
  placeholder: string
  data: T[]
}>()

const emit = defineEmits<{
  (e: 'clear'): void
}>()

defineSlots<{
  option: (props: { item: T }) => void
  item: () => void
  empty?: () => void
}>()

const search = defineModel<string>('search', { required: true })
const listId = useId()
const open = ref(false)
const activeIndex = ref(-1)
const scroller = useTemplateRef('scroller')
const input = useTemplateRef('input')
const clearButton = useTemplateRef('clearButton')

watch([() => props.data, open], () => {
  activeIndex.value = -1
}, { flush: 'sync' })

watch([scroller, activeIndex], ([list, index]) => {
  if (index >= 0)
    list?.scrollToItem(index, { align: 'nearest' })
}, { flush: 'post' })

function move(direction: number) {
  open.value = true
  if (!props.data.length)
    return

  activeIndex.value = activeIndex.value < 0
    ? (direction > 0 ? 0 : props.data.length - 1)
    : Math.max(0, Math.min(props.data.length - 1, activeIndex.value + direction))
}

async function select(item: T) {
  open.value = false
  props.selector.select(item)
  await nextTick()
  clearButton.value?.focus()
}

function onKeyDown(event: KeyboardEvent) {
  if (event.isComposing)
    return

  const candidate = props.data[activeIndex.value]
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    move(event.key === 'ArrowDown' ? 1 : -1)
  }
  else if (open.value && event.key === 'Enter' && candidate) {
    event.preventDefault()
    select(candidate)
  }
  else if (open.value && event.key === 'Escape') {
    event.stopPropagation()
    open.value = false
  }
}

async function clear() {
  emit('clear')
  await nextTick()
  input.value?.focus()
}
</script>

<template>
  <div class="flex-1 w-0 h-full">
    <div v-if="selector.state.value.selected" class="w-full overflow-hidden flex items-center border border-base rounded p1 relative">
      <div class="overflow-hidden text-ellipsis pr6 w-0 flex-1">
        <slot name="item" />
      </div>
      <button ref="clearButton" type="button" class="i-carbon-clean text-4 hover:op100 op50 absolute right-2" :aria-label="`Clear ${placeholder}`" title="Clear" @click="clear" />
    </div>
    <VMenu v-else v-model:shown="open" :distance="15" :triggers="[]" :auto-hide="false" :delay="0" no-auto-focus class="h-full">
      <input
        ref="input"
        v-model="search"
        role="combobox" aria-autocomplete="list"
        :aria-label="placeholder" :aria-expanded="open" :aria-controls="listId"
        :aria-activedescendant="open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined"
        class="py1 px4 w-full h-full border border-base rounded-1" :placeholder="placeholder"
        @focus="open = true" @click="open = true" @input="open = true" @blur="open = false"
        @keydown="onKeyDown"
      >
      <template #popper>
        <div :id="listId" role="listbox" :aria-label="placeholder" class="p2 w100">
          <DynamicScroller v-if="data.length" ref="scroller" :items="data" key-field="id" :min-item-size="32" class="max-h-64 overflow-y-auto">
            <template #default="{ item, index, active }">
              <DynamicScrollerItem :item="item" :active="active" :index="index">
                <div
                  :id="active ? `${listId}-${index}` : undefined" role="option" :aria-selected="index === activeIndex"
                  :class="{ 'bg-active': index === activeIndex }" class="mb1 cursor-pointer rounded border border-base px2 py1 hover:bg-active"
                  @mousedown.prevent @click="select(item as T)"
                >
                  <slot name="option" :item="(item as T)" />
                </div>
              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
          <slot v-else name="empty" />
        </div>
      </template>
    </VMenu>
  </div>
</template>
