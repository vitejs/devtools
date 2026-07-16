<script setup lang="ts">
import type { BuildInfo } from '~~/node/rolldown/logs-manager'
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'
import DisplayTimestamp from '@vitejs/devtools-ui/components/DisplayTimestamp.vue'
import { computed, reactive } from 'vue'
import { NuxtLink } from '#components'
import { groupByDate } from '~/utils/date-groups'
import { parseReadablePath } from '~/utils/filepath'

const props = defineProps<{
  sessionMode: 'list' | 'compare'
  sessions: BuildInfo[]
  selectedSessionIds: string[]
  selectedSessions: BuildInfo[]
}>()
const emit = defineEmits<{
  (e: 'select', session: BuildInfo): void
}>()

function parseEntryPath(session: BuildInfo) {
  const input = session.meta.inputs?.[0]
  return input ? parseReadablePath(input.filename, session.meta.cwd).path : ''
}

const selectedSessionEntry = computed(() => {
  const session = props.selectedSessions?.[0]
  return session ? parseEntryPath(session) : ''
})

const sessionItems = computed(() => props.sessions.map((session) => {
  const inputs = session.meta.inputs ?? []
  return {
    session,
    primaryInput: inputs[0],
    additionalInputCount: Math.max(inputs.length - 1, 0),
  }
}))

const sessionGroups = computed(() => groupByDate(sessionItems.value, item => item.session.timestamp))

// Keyed by group key; only tracks groups the user has explicitly toggled,
// so newly-appearing groups still fall back to their `defaultOpen` value.
const openOverrides = reactive<Record<string, boolean>>({})
function isGroupOpen(group: { key: string, defaultOpen: boolean }) {
  return openOverrides[group.key] ?? group.defaultOpen
}
function toggleGroup(group: { key: string, defaultOpen: boolean }, open: boolean) {
  openOverrides[group.key] = open
}

function checkIsDifferentEntry(session: BuildInfo) {
  return selectedSessionEntry.value && selectedSessionEntry.value !== parseEntryPath(session)
}

function select(session: BuildInfo) {
  if (props.sessionMode === 'compare' && !checkIsDifferentEntry(session)) {
    emit('select', session)
  }
}
</script>

<template>
  <div flex="~ col gap-3">
    <details
      v-for="group of sessionGroups"
      :key="group.key"
      :open="isGroupOpen(group)"
      @toggle="e => toggleGroup(group, (e.target as HTMLDetailsElement)?.open)"
    >
      <summary cursor-default select-none flex="~ gap-1 items-center" px1 py1 rounded hover="bg-active">
        <div class="i-ph-caret-right-duotone transition op50" :class="isGroupOpen(group) ? 'rotate-90' : ''" />
        <span op70 text-sm>{{ group.label }}</span>
        <span op40 text-xs font-mono>{{ group.items.length }}</span>
      </summary>

      <div flex="~ col gap-2" pt2>
        <div v-for="{ session, primaryInput, additionalInputCount } of group.items" :key="session.id" flex="~ row gap-2" relative>
          <component
            :is="sessionMode === 'list' ? NuxtLink : 'button'"
            :to="`/session/${session.id}`"
            v-bind="sessionMode !== 'list' ? { type: 'button' } : {}"
            :aria-label="`Session ${session.id}`"
            border="~ rounded-md"
            :class="sessionMode === 'list' ? ['hover:bg-active', 'border-base'] : [selectedSessionIds.includes(session.id) ? 'border-active' : 'border-base', checkIsDifferentEntry(session) || (selectedSessions.length === 2 && !selectedSessionIds.includes(session.id)) ? 'op50' : 'hover:bg-active']"
            appearance-none bg-transparent color-base text-left
            flex="~ col gap-1"
            px4 py3 w-full
            @click="select(session)"
          >
            <div flex="~ gap-1 items-center" font-mono op50 text-sm>
              <div i-ph-hash-duotone />
              {{ session.id }}
            </div>
            <div font-mono font-sm>
              {{ session.meta.cwd }}
            </div>
            <div v-if="primaryInput" flex="~ gap-1 items-center">
              <DisplayModuleId :id="primaryInput.filename" :cwd="session.meta.cwd" />
              <DisplayBadge :text="primaryInput.name || 'entry'" />
              <span v-if="additionalInputCount > 0" op50 text-xs border="~ base rounded-md" px1 font-mono>
                +{{ additionalInputCount }}
              </span>
            </div>
            <DisplayTimestamp :timestamp="session.timestamp" pt2 text-sm op50 />
          </component>
        </div>
      </div>
    </details>
  </div>
</template>
