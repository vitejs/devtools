<script setup lang="ts">
import type { DevToolsDockEntry, DevToolsViewGroup } from '@vitejs/devtools-kit'
import type { DevToolsDocksContext } from '../../state/context'
import { watchDebounced } from '@vueuse/core'
import { computed, h, ref, useTemplateRef } from 'vue'
import { getGroupMembers, getGroupMembersGrouped, resolveGroupDefaultChild } from '../../state/dock-settings'
import { sharedStateToRef } from '../../state/docks'
import { setDocksGroupPanel, useDocksGroupPanel } from '../../state/floating-tooltip'
import DockEntry from './DockEntry.vue'
import DockGroupPopover from './DockGroupPopover.vue'

const props = withDefaults(defineProps<{
  context: DevToolsDocksContext
  group: DevToolsViewGroup
  isVertical: boolean
  selected: DevToolsDockEntry | null
  dimInactive?: boolean
}>(), {
  dimInactive: true,
})

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const settings = sharedStateToRef(props.context.docks.settings)

const members = computed(() => getGroupMembers(
  props.context.docks.entries,
  props.group.id,
  settings.value,
  { whenContext: props.context.when.context },
))

// Same members, split by in-group sub-category, for the popover's sectioned view.
const membersGrouped = computed(() => getGroupMembersGrouped(
  props.context.docks.entries,
  props.group.id,
  settings.value,
  { whenContext: props.context.when.context },
))

// The group button is "active" while any of its members owns the panel.
const isActive = computed(() => {
  const id = props.selected?.id
  return !!id && members.value.some(m => m.id === id)
})

const groupButton = useTemplateRef<HTMLElement>('groupButton')
const isPanelVisible = ref(false)
const docksGroupPanel = useDocksGroupPanel()

function showPanel() {
  if (!groupButton.value)
    return
  isPanelVisible.value = true
  setDocksGroupPanel({
    el: groupButton.value,
    content: () => h(DockGroupPopover, {
      context: props.context,
      group: props.group,
      members: membersGrouped.value,
      selectedId: props.selected?.id ?? null,
      onSelect: (entry: DevToolsDockEntry) => {
        emit('select', entry)
        hidePanel()
      },
    }),
  })
}

function hidePanel() {
  isPanelVisible.value = false
  setDocksGroupPanel(null)
}

function togglePanel() {
  if (isPanelVisible.value)
    hidePanel()
  else
    showPanel()
}

// Delay syncing internal visibility from the store so it doesn't race the
// "click outside" dismissal (same pattern as the overflow button). Compare by
// element because `docksGroupPanel` is a single shared ref across every group
// button — a sibling group's popover must not light up this one.
watchDebounced(
  () => docksGroupPanel.value,
  (value) => {
    isPanelVisible.value = value?.el === groupButton.value
  },
  { debounce: 1000 },
)

function onClick() {
  // An active group closes the panel entirely.
  if (isActive.value) {
    hidePanel()
    emit('select', undefined!)
    return
  }
  // `defaultChildId` opens its member directly; otherwise reveal the popover.
  // Resolved regardless of the target's render-only `visibility` (a hidden
  // button must still fire), but honoring its `when` clause.
  const fallback = resolveGroupDefaultChild(
    props.context.docks.entries,
    props.group.id,
    props.group.defaultChildId,
    props.context.when.context,
  )
  if (fallback) {
    hidePanel()
    emit('select', fallback)
    return
  }
  togglePanel()
}
</script>

<template>
  <div ref="groupButton">
    <DockEntry
      :context="context"
      :dock="group"
      :is-vertical="isVertical"
      :is-selected="isActive || isPanelVisible"
      :is-dimmed="dimInactive && selected ? !isActive : false"
      :badge="group.badge"
      :accent-color="group.accentColor"
      @click="onClick"
    />
  </div>
</template>
