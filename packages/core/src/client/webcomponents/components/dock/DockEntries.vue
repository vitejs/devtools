<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { evaluateWhen } from 'devframe/utils/when'
import { toRefs } from 'vue'
import { getGroupMembers } from '../../state/dock-settings'
import { sharedStateToRef } from '../../state/docks'
import DockEntry from './DockEntry.vue'
import DockGroupButton from './DockGroupButton.vue'

const props = defineProps<{
  context: DocksContext
  entries: DevToolsDockEntry[]
  selected: DevToolsDockEntry | null
  isVertical: boolean
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const { selected, isVertical, entries } = toRefs(props)

const settings = sharedStateToRef(props.context.docks.settings)

function isDockVisible(dock: DevToolsDockEntry): boolean {
  // Hide empty groups — a group button with no members has nothing to reveal.
  if (dock.type === 'group') {
    const members = getGroupMembers(props.context.docks.entries, dock.id, settings.value, { whenContext: props.context.when.context })
    if (members.length === 0)
      return false
  }
  if (!dock.when)
    return true
  return evaluateWhen(dock.when, props.context.when.context)
}

function toggleDockEntry(dock: DevToolsDockEntry) {
  if (selected.value?.id === dock.id)
    emit('select', undefined!)
  else
    emit('select', dock)
}
</script>

<template>
  <template v-for="dock of entries" :key="dock.id">
    <template v-if="isDockVisible(dock)">
      <DockGroupButton
        v-if="dock.type === 'group'"
        :context="context"
        :group="dock"
        :is-vertical="isVertical"
        :selected="selected"
        @select="(e) => emit('select', e)"
      />
      <DockEntry
        v-else
        :context="context"
        :dock
        :is-action="dock.type === 'action'"
        :is-selected="selected?.id === dock.id"
        :is-dimmed="selected ? (selected.id !== dock.id) : false"
        :is-vertical="isVertical"
        :badge="dock.badge"
        @click="toggleDockEntry(dock)"
      />
    </template>
  </template>
</template>
