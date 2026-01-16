<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { DevToolsDockEntriesGrouped } from '../state/dock-settings'
import { watchDebounced } from '@vueuse/core'
import { computed, h, ref, useTemplateRef } from 'vue'
import { setDocksOverflowPanel, useDocksOverflowPanel } from '../state/floating-tooltip'
import DockEntriesWithCategories from './DockEntriesWithCategories.vue'
import DockEntry from './DockEntry.vue'

const props = defineProps<{
  context: DocksContext
  isVertical: boolean
  groups: DevToolsDockEntriesGrouped
  selected: DevToolsDockEntry | null
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const overflowButton = useTemplateRef<HTMLButtonElement>('overflowButton')
const overflowBadge = computed(() => {
  const count = props.groups.reduce((acc, [_, items]) => acc + items.length, 0)
  if (count > 9)
    return '9+'
  return count.toString()
})

const isOverflowPanelVisible = ref(false)
const docksOverflowPanel = useDocksOverflowPanel()

function showOverflowPanel() {
  if (!overflowButton.value)
    return
  isOverflowPanelVisible.value = true
  setDocksOverflowPanel({
    content: () => h('div', {
      class: 'flex gap-0 flex-wrap max-w-200px',
    }, [
      h(DockEntriesWithCategories, {
        context: props.context,
        groups: props.groups,
        isVertical: false,
        selected: props.selected,
        onSelect: e => emit('select', e),
      }),
    ]),
    el: overflowButton.value,
  })
}

// We have an internal state and delay the update to the DOM to conflicts with the "onClickOutside" logic
watchDebounced(
  () => docksOverflowPanel.value,
  (value) => {
    isOverflowPanelVisible.value = !!value
  },
  { debounce: 1000 },
)

function toggleOverflowPanel() {
  if (isOverflowPanelVisible.value)
    hideOverflowPanel()
  else
    showOverflowPanel()
}

function hideOverflowPanel() {
  isOverflowPanelVisible.value = false
  setDocksOverflowPanel(null)
}
</script>

<template>
  <div ref="overflowButton">
    <DockEntry
      :dock="{
        id: 'overflow',
        title: 'Overflow',
        icon: 'ph:dots-three-circle-duotone',
      }"
      class="overflow-button"
      :tooltip="false"
      :badge="overflowBadge"
      :is-vertical="isVertical"
      :is-selected="false"
      :is-dimmed="false"
      @click="toggleOverflowPanel"
    />
  </div>
</template>
