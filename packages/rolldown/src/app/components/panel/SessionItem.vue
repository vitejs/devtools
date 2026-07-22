<script setup lang="ts">
import type { BuildInfo } from '~~/node/rolldown/logs-manager'
import ActionIconButton from '@vitejs/devtools-ui/components/Action/ActionIconButton.vue'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayTimestamp from '@vitejs/devtools-ui/components/Display/DisplayTimestamp.vue'
import { computed } from 'vue'
import { NuxtLink } from '#components'

const props = defineProps<{
  session: BuildInfo
  sessionMode: 'list' | 'compare'
  /** Whether this session is currently part of the compare selection. */
  selected?: boolean
  /** Whether this card should read as unavailable/deemphasised. */
  dimmed?: boolean
  /** The live project cwd; the session cwd is hidden when it matches. */
  currentCwd?: string
  /** Whether to show the rename/delete actions. */
  showActions?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', session: BuildInfo): void
  (e: 'rename', session: BuildInfo): void
  (e: 'delete', session: BuildInfo): void
}>()

const inputs = computed(() => props.session.meta.inputs ?? [])
const primaryInput = computed(() => inputs.value[0])
const additionalInputCount = computed(() => Math.max(inputs.value.length - 1, 0))

function normalizeCwd(path?: string) {
  return (path ?? '').replace(/[/\\]+$/, '')
}

// Hide the cwd line when the session was built in the current project — it's
// just noise then. When the project cwd is unknown, keep showing it.
const showCwd = computed(() => {
  const cwd = props.session.meta.cwd
  return !!cwd && normalizeCwd(cwd) !== normalizeCwd(props.currentCwd)
})

const platform = computed(() => props.session.meta.platform)
const format = computed(() => props.session.meta.format)
const pluginCount = computed(() => props.session.meta.plugins?.length ?? 0)

const output = computed(() => props.session.meta.dir || props.session.meta.file || '')
const outputLabel = computed(() => {
  const value = output.value
  if (!value)
    return ''
  const cwd = normalizeCwd(props.session.meta.cwd)
  if (cwd && value.startsWith(cwd)) {
    return value.slice(cwd.length).replace(/^[/\\]+/, '') || value
  }
  return value
})
const outputIsFile = computed(() => !props.session.meta.dir && !!props.session.meta.file)

const label = computed(() => props.session.alias || props.session.id)
</script>

<template>
  <div class="flex flex-row gap-2 relative group">
    <component
      :is="sessionMode === 'list' ? NuxtLink : 'button'"
      :to="`/session/${session.id}`"
      v-bind="sessionMode !== 'list' ? { type: 'button' } : {}"
      :aria-label="`Session ${label}`"
      class="border rounded-md appearance-none bg-transparent color-base text-left flex flex-col gap-1 px4 py3 w-full"
      :class="sessionMode === 'list'
        ? ['hover:bg-active', 'border-base']
        : [selected ? 'border-active' : 'border-base', dimmed ? 'op50' : 'hover:bg-active']"
      @click="emit('select', session)"
    >
      <div v-if="session.alias" class="flex gap-1 items-center font-medium pr16">
        <div class="i-ph-bookmark-simple-duotone op60 flex-none" />
        <span class="truncate">{{ session.alias }}</span>
      </div>
      <div class="flex gap-1 items-center font-mono op50 text-sm">
        <div class="i-ph-hash-duotone" />
        {{ session.id }}
      </div>
      <div v-if="primaryInput" class="flex gap-1 items-center">
        <DisplayModuleId :id="primaryInput.filename" :cwd="session.meta.cwd" />
        <DisplayBadge :text="primaryInput.name || 'entry'" />
        <span v-if="additionalInputCount > 0" class="op50 text-xs border border-base rounded-md px1 font-mono">
          +{{ additionalInputCount }}
        </span>
      </div>

      <!-- Session cwd, hidden when it matches the current project cwd. -->
      <div v-if="showCwd" class="font-mono text-sm op-fade">
        {{ session.meta.cwd }}
      </div>

      <!-- Extra build metadata, shown only when present. -->
      <div class="flex gap-2 flex-wrap items-center text-xs op60 pt1">
        <span v-if="platform" class="flex gap-1 items-center">
          <div class="i-ph-cpu-duotone" />
          {{ platform }}
        </span>
        <span v-if="format" class="flex gap-1 items-center">
          <div class="i-ph-file-duotone" />
          {{ format }}
        </span>
        <span v-if="pluginCount" class="flex gap-1 items-center">
          <div class="i-ph-plugs-duotone" />
          {{ pluginCount }} plugin{{ pluginCount > 1 ? 's' : '' }}
        </span>
        <span v-if="outputLabel" class="flex gap-1 items-center font-mono max-w-50" :title="output">
          <div :class="outputIsFile ? 'i-ph-file-duotone' : 'i-ph-folder-open-duotone'" class="flex-none" />
          <span class="truncate">{{ outputLabel }}</span>
        </span>
      </div>

      <DisplayTimestamp :timestamp="session.timestamp" class="pt2 text-sm op50" />
    </component>

    <!-- Per-session actions overlaid top-right (siblings of the card,
         so they never nest inside the link/button). -->
    <div v-if="showActions" class="absolute top-2 right-2 flex gap-1 op0 group-hover:op100 focus-within:op100 transition">
      <ActionIconButton
        icon="i-ph-pencil-simple-duotone"
        tooltip="Rename (set alias)"
        compact
        @click="emit('rename', session)"
      />
      <ActionIconButton
        icon="i-ph-trash-duotone"
        tooltip="Delete session"
        compact
        active-class="text-red bg-active op100"
        @click="emit('delete', session)"
      />
    </div>
  </div>
</template>
