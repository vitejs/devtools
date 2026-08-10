<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { evaluateWhen } from 'devframe/utils/when'
import { toRefs } from 'vue'
import { getGroupMembers, resolveGroupDefaultChild } from '../../state/dock-settings'
import { sharedStateToRef } from '../../state/docks'
import DockEntry from './DockEntry.vue'
import DockGroupButton from './DockGroupButton.vue'

const props = withDefaults(defineProps<{
  context: DocksContext
  entries: DevToolsDockEntry[]
  selected: DevToolsDockEntry | null
  isVertical: boolean
  dimInactive?: boolean
}>(), {
  dimInactive: true,
})

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const { selected, isVertical, entries } = toRefs(props)

const settings = sharedStateToRef(props.context.docks.settings)

function isDockVisible(dock: DevToolsDockEntry): boolean {
  // Hide empty groups — a group button with no members has nothing to reveal.
  // A `defaultChildId` still counts as "something to reveal" even when its
  // target is render-only hidden via `visibility`: clicking the group button
  // jumps straight to that member instead of opening the (visibly empty)
  // popover, so the button must stay reachable. Only treat the group as empty
  // when no member is visible AND no reachable `defaultChildId` target exists
  // (a target hidden by its own `when` clause doesn't count as reachable).
  if (dock.type === 'group') {
    const members = getGroupMembers(props.context.docks.entries, dock.id, settings.value, { whenContext: props.context.when.context })
    if (members.length === 0 && !resolveGroupDefaultChild(props.context.docks.entries, dock.id, dock.defaultChildId, props.context.when.context))
      return false
  }
  if (dock.when && !evaluateWhen(dock.when, props.context.when.context))
    return false
  // Render-only counterpart to `when`: hides just this button, leaving the
  // entry itself registered and reachable everywhere else.
  if (dock.visibility && !evaluateWhen(dock.visibility, props.context.when.context))
    return false
  return true
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
        :dim-inactive="dimInactive"
        @select="(e) => emit('select', e)"
      />
      <DockEntry
        v-else
        :context="context"
        :dock
        :is-action="dock.type === 'action'"
        :is-selected="selected?.id === dock.id"
        :is-dimmed="dimInactive && selected ? (selected.id !== dock.id) : false"
        :is-vertical="isVertical"
        :badge="dock.badge"
        :badge-variant="dock.badgeVariant"
        @click="toggleDockEntry(dock)"
      />
    </template>
  </template>
</template>
