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
  /** Whether to show the rename/delete actions. */
  showActions?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', session: BuildInfo): void
  (e: 'rename', session: BuildInfo): void
  (e: 'delete', session: BuildInfo): void
}>()

const platformIcons: Record<string, string | undefined> = {
  node: 'i-catppuccin-package-json icon-catppuccin',
  browser: 'i-catppuccin-http icon-catppuccin',
}

const inputs = computed(() => props.session.meta.inputs ?? [])
const primaryInput = computed(() => inputs.value[0])
const additionalInputCount = computed(() => Math.max(inputs.value.length - 1, 0))

const platform = computed(() => props.session.meta.platform)
const format = computed(() => props.session.meta.format)
const pluginCount = computed(() => props.session.meta.plugins?.length ?? 0)
const label = computed(() => props.session.alias || props.session.id)
</script>

<template>
  <div class="flex flex-row gap-2 relative pt-3 group">
    <component
      :is="sessionMode === 'list' ? NuxtLink : 'button'"
      :to="`/session/${session.id}`"
      v-bind="sessionMode !== 'list' ? { type: 'button' } : {}"
      :aria-label="`Session ${label}`"
      class="border rounded-md appearance-none bg-transparent color-base text-left flex flex-col gap-1 px4 pb3 pt5 w-full"
      :class="sessionMode === 'list'
        ? ['hover:bg-active', 'border-base']
        : [selected ? 'border-active bg-primary/2!' : 'border-base', dimmed ? 'op50' : 'hover:bg-active']"
      @click="emit('select', session)"
    >
      <div class="absolute top-0 left-2 flex gap-1 items-center">
        <div
          v-if="session.alias"
          class="flex gap-1 items-center font-medium text-xs border px2 py1 rounded-full bg-base"
          :class="selected ? 'border-active' : 'border-base'"
        >
          <div class="i-ph-bookmark-simple-duotone op60 flex-none" />
          <span class="truncate">{{ session.alias }}</span>
        </div>
        <div
          class="flex gap-1 items-center font-mono text-xs border border-base px2 py1 rounded-full bg-base"
          :class="selected ? 'border-active' : 'border-base'"
        >
          <div class="i-ph-hash-duotone op-fade" />
          <span class="op-fade">{{ session.id }}</span>
        </div>
      </div>
      <div v-if="primaryInput" class="flex gap-1 items-center">
        <DisplayModuleId :id="primaryInput.filename" :cwd="session.meta.cwd" />
        <DisplayBadge :text="primaryInput.name || 'entry'" />
        <span v-if="additionalInputCount > 0" class="op50 text-xs border border-base rounded-md px1 font-mono">
          +{{ additionalInputCount }}
        </span>
      </div>

      <!-- Extra build metadata, shown only when present. -->
      <div class="flex gap-2 flex-wrap items-center text-sm op60 pt1">
        <span v-if="platform" class="flex gap-1 items-center">
          <div :class="platformIcons[platform] || 'i-ph-cpu-duotone' " />
          {{ platform }}
        </span>
        <span v-if="format" class="flex gap-1 items-center">
          <div class="i-ph-files-duotone" />
          {{ format }}
        </span>
        <span v-if="pluginCount" class="flex gap-1 items-center">
          <div class="i-ph-plugs-duotone" />
          <span class="font-mono">{{ pluginCount }}</span> plugin{{ pluginCount > 1 ? 's' : '' }}
        </span>
      </div>

      <DisplayTimestamp :timestamp="session.timestamp" class="pt2 text-sm op-fade" />
    </component>

    <!-- Per-session actions overlaid top-right (siblings of the card,
         so they never nest inside the link/button). -->
    <div v-if="showActions" class="absolute top-5 right-2 flex gap-1 op0 group-hover:op100 focus-within:op100 transition">
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
