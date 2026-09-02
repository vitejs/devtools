<script setup lang="ts">
import type { BuildInfo } from '~~/node/rolldown/logs-manager'
import ActionButton from '@vitejs/devtools-ui/components/Action/ActionButton.vue'
import ActionIconButton from '@vitejs/devtools-ui/components/Action/ActionIconButton.vue'
import OverlayModal from '@vitejs/devtools-ui/components/Overlay/OverlayModal.vue'
import { groupByDate } from '@vitejs/devtools-ui/utils/date-groups'
import { computed, nextTick, reactive, ref } from 'vue'
import { parseReadablePath } from '~/utils/filepath'
import SessionItem from './SessionItem.vue'

const props = defineProps<{
  sessionMode: 'list' | 'compare'
  sessions: BuildInfo[]
  selectedSessionIds: string[]
  selectedSessions: BuildInfo[]
  /** Whether to show per-session rename/delete actions on each item. */
  showSessionActions: boolean
  /** The live project cwd, threaded down to hide matching session cwds. */
  currentCwd?: string
}>()
const emit = defineEmits<{
  (e: 'select', session: BuildInfo): void
  (e: 'rename', session: BuildInfo, alias: string): void
  (e: 'delete', session: BuildInfo): void
}>()

function parseEntryPath(session: BuildInfo) {
  const input = session.meta.inputs?.[0]
  return input ? parseReadablePath(input.filename, session.meta.cwd).path : ''
}

const selectedSessionEntry = computed(() => {
  const session = props.selectedSessions?.[0]
  return session ? parseEntryPath(session) : ''
})

// ---- Filtering ----------------------------------------------------------

const search = ref('')
// `null` means "no entry filter" — every entry is shown.
const selectedEntries = ref<string[] | null>(null)

const entryOptions = computed(() => {
  const counts = new Map<string, number>()
  for (const session of props.sessions) {
    const entry = parseEntryPath(session)
    if (!entry)
      continue
    counts.set(entry, (counts.get(entry) ?? 0) + 1)
  }
  return Array.from(counts, ([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))
})

function isEntryActive(value: string) {
  return selectedEntries.value == null || selectedEntries.value.includes(value)
}

function toggleEntry(value: string) {
  const all = entryOptions.value.map(e => e.value)
  let selected = selectedEntries.value ?? all
  selected = selected.includes(value)
    ? selected.filter(v => v !== value)
    : [...selected, value]
  selectedEntries.value = selected.length === all.length ? null : selected
}

function clearEntryFilter() {
  selectedEntries.value = null
}

const filteredSessions = computed(() => {
  const query = search.value.trim().toLowerCase()
  return props.sessions.filter((session) => {
    if (selectedEntries.value && !selectedEntries.value.includes(parseEntryPath(session)))
      return false
    if (!query)
      return true
    const haystack = [session.id, session.alias, session.meta.cwd, parseEntryPath(session)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
})

const isFiltering = computed(() => !!search.value.trim() || selectedEntries.value != null)

// ---- Grouping -----------------------------------------------------------

const sessionGroups = computed(() => groupByDate(filteredSessions.value, session => session.timestamp))

// Keyed by group key; only tracks groups the user has explicitly toggled,
// so newly-appearing groups still fall back to their `defaultOpen` value.
const openOverrides = reactive<Record<string, boolean>>({})
function isGroupOpen(group: { key: string, defaultOpen: boolean }) {
  return openOverrides[group.key] ?? group.defaultOpen
}
function toggleGroup(group: { key: string, defaultOpen: boolean }, open: boolean) {
  openOverrides[group.key] = open
}

// ---- Selection (compare mode) -------------------------------------------

function checkIsDifferentEntry(session: BuildInfo) {
  return selectedSessionEntry.value && selectedSessionEntry.value !== parseEntryPath(session)
}

function select(session: BuildInfo) {
  if (props.sessionMode === 'compare' && !checkIsDifferentEntry(session)) {
    emit('select', session)
  }
}

function isDimmed(session: BuildInfo) {
  if (props.sessionMode !== 'compare')
    return false
  return checkIsDifferentEntry(session)
    || (props.selectedSessions.length === 2 && !props.selectedSessionIds.includes(session.id))
}

// ---- Rename / delete actions --------------------------------------------

const renameOpen = ref(false)
const renameTarget = ref<BuildInfo | null>(null)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

async function openRename(session: BuildInfo) {
  renameTarget.value = session
  renameValue.value = session.alias ?? ''
  renameOpen.value = true
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}

function confirmRename() {
  if (renameTarget.value) {
    emit('rename', renameTarget.value, renameValue.value.trim())
  }
  renameOpen.value = false
  renameTarget.value = null
}

const deleteOpen = ref(false)
const deleteTarget = ref<BuildInfo | null>(null)

function openDelete(session: BuildInfo) {
  deleteTarget.value = session
  deleteOpen.value = true
}

function confirmDelete() {
  if (deleteTarget.value) {
    emit('delete', deleteTarget.value)
  }
  deleteOpen.value = false
  deleteTarget.value = null
}

function sessionLabel(session: BuildInfo | null) {
  return session?.alias || session?.id || ''
}
</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <!-- Filter panel -->
    <div v-if="sessions.length" class="flex flex-col border border-base rounded-xl bg-glass of-hidden">
      <div class="flex items-center gap-2 px3">
        <div class="i-ph-magnifying-glass-duotone op40 flex-none" />
        <input
          v-model="search"
          class="py2 w-full bg-transparent"
          style="outline: none"
          placeholder="Filter sessions by name, entry or path…"
        >
        <ActionIconButton
          v-if="isFiltering"
          icon="i-ph-x"
          tooltip="Clear filters"
          compact
          @click="search = ''; clearEntryFilter()"
        />
      </div>
      <div v-if="entryOptions.length > 1" class="flex flex-wrap gap-2 p2 border-t border-base">
        <span class="flex items-center gap-1 op50 text-xs pr1">
          <div class="i-ph-funnel-duotone" />
          Entry
        </span>
        <button
          v-for="entry of entryOptions"
          :key="entry.value"
          type="button"
          class="border border-base rounded-md px2 py0.5 flex items-center gap-1 select-none text-sm font-mono max-w-60"
          :class="isEntryActive(entry.value) ? 'bg-active' : 'op50 hover:op80'"
          :title="entry.value"
          @click="toggleEntry(entry.value)"
        >
          <span class="truncate">{{ entry.value }}</span>
          <span class="op50 text-xs flex-none">{{ entry.count }}</span>
        </button>
      </div>
    </div>

    <!-- Session groups -->
    <template v-if="sessionGroups.length">
      <details
        v-for="group of sessionGroups"
        :key="group.key"
        :open="isGroupOpen(group)"
        @toggle="e => toggleGroup(group, (e.target as HTMLDetailsElement)?.open)"
      >
        <summary class="cursor-default select-none flex gap-1 items-center px1 py1 rounded hover:bg-active">
          <div class="i-ph-caret-right-duotone transition op50" :class="isGroupOpen(group) ? 'rotate-90' : ''" />
          <span class="op70 text-sm">{{ group.label }}</span>
          <span class="op40 text-xs font-mono">{{ group.items.length }}</span>
        </summary>

        <div class="flex flex-col gap-2 pt2">
          <SessionItem
            v-for="session of group.items"
            :key="session.id"
            :session="session"
            :session-mode="sessionMode"
            :current-cwd="currentCwd"
            :selected="selectedSessionIds.includes(session.id)"
            :dimmed="isDimmed(session)"
            :show-actions="showSessionActions"
            @select="select"
            @rename="openRename"
            @delete="openDelete"
          />
        </div>
      </details>
    </template>

    <!-- Empty filtered state -->
    <div v-else-if="sessions.length" class="border border-base border-dashed rounded-xl p6 flex flex-col items-center gap-2 op60">
      <div class="i-ph-funnel-x-duotone text-2xl" />
      <p class="m0 text-sm text-center">
        No sessions match the current filter.
      </p>
      <ActionButton size="sm" @click="search = ''; clearEntryFilter()">
        Clear filters
      </ActionButton>
    </div>

    <!-- Rename dialog -->
    <OverlayModal v-model:open="renameOpen">
      <template #title>
        Rename session
      </template>
      <form class="flex flex-col gap-4 w-100 max-w-full" @submit.prevent="confirmRename()">
        <p class="m0 op60 text-sm">
          Set a friendly alias for
          <code class="font-mono">#{{ renameTarget?.id }}</code>. Leave empty to clear it.
        </p>
        <input
          ref="renameInput"
          v-model="renameValue"
          class="p2 px3 border border-base rounded-lg bg-code w-full"
          style="outline: none"
          placeholder="e.g. Before caching tweak"
          maxlength="80"
        >
        <div class="flex justify-end gap-2">
          <ActionButton type="button" @click="renameOpen = false">
            Cancel
          </ActionButton>
          <ActionButton type="submit" variant="primary" icon="i-ph:check">
            Save
          </ActionButton>
        </div>
      </form>
    </OverlayModal>

    <!-- Delete confirmation dialog -->
    <OverlayModal v-model:open="deleteOpen">
      <template #title>
        Delete session
      </template>
      <div class="flex flex-col gap-4 w-100 max-w-full">
        <p class="m0 op70 text-sm">
          Permanently delete
          <code class="font-mono">{{ sessionLabel(deleteTarget) }}</code>
          and its recorded build data from disk? This cannot be undone.
        </p>
        <div class="flex justify-end gap-2">
          <ActionButton @click="deleteOpen = false">
            Cancel
          </ActionButton>
          <ActionButton variant="primary" icon="i-ph-trash-duotone" class="bg-red! border-red!" @click="confirmDelete()">
            Delete
          </ActionButton>
        </div>
      </div>
    </OverlayModal>
  </div>
</template>
