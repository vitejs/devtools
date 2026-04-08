<script setup lang="ts">
import type { DevToolsCommandEntry, DevToolsCommandKeybinding } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { computed, ref, watch } from 'vue'
import { sharedStateToRef } from '../../state/docks'
import { formatKeybinding, isMac, KNOWN_BROWSER_SHORTCUTS } from '../../state/keybindings'
import KeybindingBadge from '../command-palette/KeybindingBadge.vue'
import DockIcon from '../dock/DockIcon.vue'

const props = defineProps<{
  context: DocksContext
}>()

const commandsCtx = props.context.commands
const settings = sharedStateToRef(commandsCtx.settings)
const shortcutOverrides = computed(() => settings.value.commandShortcuts ?? {})
const shortcutSearch = ref('')

interface ShortcutRow {
  command: DevToolsCommandEntry
  parentTitle?: string
  indent: boolean
}

const shortcutRows = computed<ShortcutRow[]>(() => {
  const rows: ShortcutRow[] = []
  for (const cmd of commandsCtx.commands) {
    rows.push({ command: cmd, indent: false })
    if (cmd.children) {
      for (const child of cmd.children) {
        rows.push({
          command: child as DevToolsCommandEntry,
          parentTitle: cmd.title,
          indent: true,
        })
      }
    }
  }
  return rows
})

const filteredShortcutRows = computed(() => {
  if (!shortcutSearch.value)
    return shortcutRows.value
  const q = shortcutSearch.value.toLowerCase()
  return shortcutRows.value.filter(row =>
    row.command.title.toLowerCase().includes(q)
    || row.command.id.toLowerCase().includes(q)
    || row.command.description?.toLowerCase().includes(q),
  )
})

function getEffectiveKeybindings(id: string): DevToolsCommandKeybinding[] {
  return commandsCtx.getKeybindings(id)
}

function isOverridden(id: string): boolean {
  return shortcutOverrides.value[id] !== undefined
}

function getDefaultKey(id: string): string | undefined {
  for (const cmd of commandsCtx.commands) {
    if (cmd.id === id)
      return cmd.keybindings?.[0]?.key
    if (cmd.children) {
      const child = cmd.children.find(c => c.id === id)
      if (child)
        return child.keybindings?.[0]?.key
    }
  }
}

function clearShortcut(commandId: string) {
  commandsCtx.settings.mutate((state) => {
    state.commandShortcuts[commandId] = []
  })
}

function resetShortcut(commandId: string) {
  commandsCtx.settings.mutate((state) => {
    delete state.commandShortcuts[commandId]
  })
}

// --- Shortcut Editor Popup ---
const editorOpen = ref(false)
const editorCommandId = ref<string | null>(null)
const editorMod = ref(false)
const editorCtrl = ref(false)
const editorAlt = ref(false)
const editorShift = ref(false)
const editorKey = ref('')

function openEditor(commandId: string) {
  const bindings = getEffectiveKeybindings(commandId)
  editorCommandId.value = commandId
  if (bindings.length > 0) {
    const parts = bindings[0]!.key.split('+')
    editorMod.value = parts.includes('Mod')
    editorCtrl.value = parts.includes('Ctrl')
    editorAlt.value = parts.includes('Alt')
    editorShift.value = parts.includes('Shift')
    editorKey.value = parts.filter(p => !['Mod', 'Ctrl', 'Alt', 'Shift', 'Meta'].includes(p)).join('+')
  }
  else {
    editorMod.value = false
    editorCtrl.value = false
    editorAlt.value = false
    editorShift.value = false
    editorKey.value = ''
  }
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  editorCommandId.value = null
}

const editorComposedKey = computed(() => {
  const parts: string[] = []
  if (editorMod.value)
    parts.push('Mod')
  if (editorCtrl.value)
    parts.push('Ctrl')
  if (editorAlt.value)
    parts.push('Alt')
  if (editorShift.value)
    parts.push('Shift')
  if (editorKey.value)
    parts.push(editorKey.value)
  return parts.join('+')
})

const editorWarnings = computed<string[]>(() => {
  const warnings: string[] = []
  const key = editorComposedKey.value
  if (!key)
    return warnings

  // Too simple: single key without modifiers
  const hasModifier = editorMod.value || editorCtrl.value || editorAlt.value
  if (!hasModifier && editorKey.value) {
    warnings.push('Single key without modifiers may interfere with typing')
  }

  // Only Shift + letter is also too simple
  if (!hasModifier && editorShift.value && editorKey.value.length === 1) {
    warnings.push('Shift + letter may interfere with typing')
  }

  // Browser / OS conflict — show the description
  const browserDescription = KNOWN_BROWSER_SHORTCUTS[key]
  if (browserDescription) {
    const formatted = formatKeybinding(key).join('+')
    warnings.push(`Conflicts with browser shortcut: ${browserDescription} (${formatted})`)
  }

  // Conflict with other commands
  if (editorCommandId.value) {
    for (const row of shortcutRows.value) {
      if (row.command.id === editorCommandId.value)
        continue
      const bindings = getEffectiveKeybindings(row.command.id)
      if (bindings.some(b => b.key === key)) {
        warnings.push(`Conflicts with "${row.command.title}"`)
        break
      }
    }
  }

  return warnings
})

const editorCanSave = computed(() => {
  return editorKey.value.length > 0
})

function onEditorKeyDown(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()

  if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key))
    return

  // Update modifiers from event
  editorMod.value = isMac ? e.metaKey : e.ctrlKey
  if (isMac && e.ctrlKey)
    editorCtrl.value = true
  editorAlt.value = e.altKey
  editorShift.value = e.shiftKey

  let key = e.key
  if (key.length === 1)
    key = key.toUpperCase()
  editorKey.value = key
}

function saveEditor() {
  if (!editorCommandId.value || !editorCanSave.value)
    return
  const defaultKey = getDefaultKey(editorCommandId.value)
  if (editorComposedKey.value === defaultKey) {
    if (isOverridden(editorCommandId.value)) {
      commandsCtx.settings.mutate((state) => {
        delete state.commandShortcuts[editorCommandId.value!]
      })
    }
  }
  else {
    commandsCtx.settings.mutate((state) => {
      state.commandShortcuts[editorCommandId.value!] = [{ key: editorComposedKey.value }]
    })
  }
  closeEditor()
}

// Close editor on Escape
watch(editorOpen, (v) => {
  if (!v)
    return
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Only close if not captured by the key input
      const active = document.activeElement
      if (!active || !active.classList.contains('shortcut-key-input')) {
        closeEditor()
        window.removeEventListener('keydown', handler)
      }
    }
  }
  window.addEventListener('keydown', handler)
})
</script>

<template>
  <p class="text-sm op50 mb-4">
    Customize keyboard shortcuts for commands.
  </p>

  <!-- Search -->
  <div class="mb-3">
    <input
      v-model="shortcutSearch"
      class="w-full bg-gray/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
      placeholder="Search commands..."
    >
  </div>

  <!-- Shortcut list -->
  <div class="border border-base rounded-lg overflow-hidden">
    <div
      v-for="row of filteredShortcutRows"
      :key="row.command.id"
      class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray/5 transition-colors border-b border-base last:border-b-0"
    >
      <!-- Icon & Title -->
      <DockIcon
        v-if="row.command.icon"
        :icon="row.command.icon"
        class="w-4 h-4 shrink-0 op60"
        :class="{ 'ml-6': row.indent }"
      />
      <div v-else :class="{ 'ml-6': row.indent }" class="w-4 h-4 shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="truncate text-sm">{{ row.command.title }}</span>
          <span
            v-if="row.command.source === 'server'"
            class="text-[10px] px-1.5 py-0.5 rounded bg-blue/10 text-blue shrink-0"
          >server</span>
        </div>
        <div v-if="row.command.description" class="text-xs op40 truncate mt-0.5">
          {{ row.command.description }}
        </div>
      </div>

      <!-- Keybinding display -->
      <div class="flex items-center gap-1.5 shrink-0">
        <template v-if="getEffectiveKeybindings(row.command.id).length > 0">
          <button
            v-for="(kb, ki) of getEffectiveKeybindings(row.command.id)"
            :key="ki"
            class="flex items-center gap-0.5 hover:bg-gray/10 rounded px-1 py-0.5 transition-colors"
            title="Click to edit"
            @click="openEditor(row.command.id)"
          >
            <KeybindingBadge :key-string="kb.key" />
          </button>
        </template>
        <button
          v-else
          class="text-xs op30 hover:op60 px-2 py-1 rounded hover:bg-gray/10 transition-colors"
          @click="openEditor(row.command.id)"
        >
          Add shortcut
        </button>

        <!-- Clear shortcut -->
        <button
          v-if="getEffectiveKeybindings(row.command.id).length > 0"
          class="w-5 h-5 flex items-center justify-center rounded hover:bg-gray/20 transition-colors op30 hover:op70"
          title="Clear shortcut"
          @click="clearShortcut(row.command.id)"
        >
          <div class="i-ph-x text-xs" />
        </button>

        <!-- Reset to default (only if overridden) -->
        <button
          v-if="isOverridden(row.command.id)"
          class="w-5 h-5 flex items-center justify-center rounded hover:bg-gray/20 transition-colors op30 hover:op70"
          title="Reset to default"
          @click="resetShortcut(row.command.id)"
        >
          <div class="i-ph-arrow-counter-clockwise text-xs" />
        </button>
      </div>
    </div>

    <div
      v-if="filteredShortcutRows.length === 0"
      class="py-6 text-center text-sm op40"
    >
      No commands found
    </div>
  </div>

  <!-- Shortcut Editor Popup -->
  <div
    v-if="editorOpen"
    class="fixed inset-0 z-command-palette flex items-center justify-center"
  >
    <div class="absolute inset-0 bg-black/30" @click="closeEditor" />
    <div class="relative bg-base border border-base rounded-lg shadow-xl w-96 p-5">
      <h3 class="text-sm font-medium mb-4">
        Edit Shortcut
      </h3>

      <!-- Key capture input -->
      <div class="mb-4">
        <label class="text-xs op50 mb-1.5 block">Press a key combination or toggle modifiers below</label>
        <input
          class="shortcut-key-input w-full bg-gray/10 border border-base rounded-lg px-3 py-2.5 text-center text-sm font-mono outline-none focus:border-primary/40"
          :value="editorComposedKey ? formatKeybinding(editorComposedKey).join(' + ') : ''"
          placeholder="Press keys..."
          readonly
          @keydown="onEditorKeyDown"
        >
      </div>

      <!-- Modifier toggles -->
      <div class="flex items-center gap-2 mb-4">
        <button
          class="px-3 py-1.5 rounded-md text-xs font-mono border transition-colors"
          :class="editorMod ? 'bg-primary/15 border-primary/30 text-primary' : 'border-base op50 hover:op80'"
          @click="editorMod = !editorMod"
        >
          {{ isMac ? '\u2318 Cmd' : 'Ctrl' }}
        </button>
        <button
          v-if="isMac"
          class="px-3 py-1.5 rounded-md text-xs font-mono border transition-colors"
          :class="editorCtrl ? 'bg-primary/15 border-primary/30 text-primary' : 'border-base op50 hover:op80'"
          @click="editorCtrl = !editorCtrl"
        >
          \u2303 Ctrl
        </button>
        <button
          class="px-3 py-1.5 rounded-md text-xs font-mono border transition-colors"
          :class="editorAlt ? 'bg-primary/15 border-primary/30 text-primary' : 'border-base op50 hover:op80'"
          @click="editorAlt = !editorAlt"
        >
          {{ isMac ? '\u2325 Alt' : 'Alt' }}
        </button>
        <button
          class="px-3 py-1.5 rounded-md text-xs font-mono border transition-colors"
          :class="editorShift ? 'bg-primary/15 border-primary/30 text-primary' : 'border-base op50 hover:op80'"
          @click="editorShift = !editorShift"
        >
          {{ isMac ? '\u21E7 Shift' : 'Shift' }}
        </button>
      </div>

      <!-- Warnings -->
      <div v-if="editorWarnings.length > 0" class="mb-4 flex flex-col gap-1.5">
        <div
          v-for="(warning, wi) of editorWarnings"
          :key="wi"
          class="flex items-center gap-1.5 text-xs text-amber"
        >
          <div class="i-ph-warning-duotone w-3.5 h-3.5 shrink-0" />
          {{ warning }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2">
        <button
          class="px-3 py-1.5 rounded text-xs op60 hover:op100 hover:bg-gray/10 transition-colors"
          @click="closeEditor"
        >
          Cancel
        </button>
        <button
          class="px-3 py-1.5 rounded text-xs transition-colors"
          :class="editorCanSave
            ? 'bg-primary/15 text-primary hover:bg-primary/25'
            : 'op30 cursor-not-allowed'"
          :disabled="!editorCanSave"
          @click="saveEditor"
        >
          OK
        </button>
      </div>
    </div>
  </div>
</template>
