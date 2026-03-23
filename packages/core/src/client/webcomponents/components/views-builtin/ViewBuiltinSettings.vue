<script setup lang="ts">
import type { DevToolsCommandEntry, DevToolsCommandKeybinding, DevToolsViewBuiltin } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { computed, ref, watch } from 'vue'
import { formatKeybinding, isMac } from '../../state/commands'
import { docksGroupByCategories } from '../../state/dock-settings'
import { sharedStateToRef } from '../../state/docks'
import { isDockPopupSupported, requestDockPopupOpen, useIsDockPopupOpen } from '../../state/popup'
import DockIcon from '../dock/DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewBuiltin
}>()

// --- Tabs ---
const tabs = [
  { id: 'appearance', label: 'Appearance', icon: 'i-ph-paint-brush-duotone' },
  { id: 'shortcuts', label: 'Shortcuts', icon: 'i-ph-keyboard-duotone' },
  { id: 'docks', label: 'Docks', icon: 'i-ph-layout-duotone' },
] as const

type TabId = (typeof tabs)[number]['id']
const activeTab = ref<TabId>('appearance')

// --- Appearance ---
const settingsStore = props.context.docks.settings
const settings = sharedStateToRef(settingsStore)
const panelStore = props.context.panel.store
const isEmbedded = props.context.clientType === 'embedded'
const isDockPopupOpen = useIsDockPopupOpen()

const dockModeOptions = computed(() => {
  const options = [
    { value: 'float', label: 'Float', icon: 'i-ph-cards-three-duotone' },
    { value: 'edge', label: 'Edge', icon: 'i-ph-square-half-bottom-duotone' },
  ]
  if (isDockPopupSupported()) {
    options.push({ value: 'popup', label: 'Popup', icon: 'i-ph-arrow-square-out-duotone' })
  }
  return options
})

const currentDockMode = computed(() => panelStore.mode)

function setDockMode(mode: string) {
  if (mode === 'popup') {
    requestDockPopupOpen(props.context)
  }
  else {
    panelStore.mode = mode as 'float' | 'edge'
  }
}

// --- Docks ---
const categories = computed(() => {
  return docksGroupByCategories(props.context.docks.entries, settingsStore.value(), { includeHidden: true })
})

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    '~viteplus': 'Vite+',
    'default': 'Default',
    'app': 'App',
    'framework': 'Framework',
    'web': 'Web',
    'advanced': 'Advanced',
    '~builtin': 'Built-in',
  }
  return labels[category] || category
}

function toggleDock(id: string, visible?: boolean) {
  const hidden = settings.value.docksHidden
  const isHidden = hidden.includes(id)
  const shouldShow = visible ?? isHidden

  if (shouldShow) {
    settingsStore.mutate((state) => {
      state.docksHidden = state.docksHidden.filter((i: string) => i !== id)
    })
  }
  else {
    settingsStore.mutate((state) => {
      state.docksHidden = [...state.docksHidden, id]
    })
  }
}

function toggleCategory(category: string, visible?: boolean) {
  const hidden = settings.value.docksCategoriesHidden
  const isHidden = hidden.includes(category)
  const shouldShow = visible ?? isHidden

  if (shouldShow) {
    settingsStore.mutate((state) => {
      state.docksCategoriesHidden = state.docksCategoriesHidden.filter((i: string) => i !== category)
    })
  }
  else {
    settingsStore.mutate((state) => {
      state.docksCategoriesHidden = [...state.docksCategoriesHidden, category]
    })
  }
}

function togglePin(id: string) {
  const pinned = settings.value.docksPinned
  if (pinned.includes(id)) {
    settingsStore.mutate((state) => {
      state.docksPinned = state.docksPinned.filter((i: string) => i !== id)
    })
  }
  else {
    settingsStore.mutate((state) => {
      state.docksPinned = [...state.docksPinned, id]
    })
  }
}

function isInCustomOrder(id: string): boolean {
  return settings.value.docksCustomOrder[id] !== undefined
}

function moveOrder(category: string, id: string, delta: number) {
  const items = categories.value.find(([cat]) => cat === category)
  if (!items)
    throw new Error(`Category ${category} not found`)
  const array = [...items[1]]
  const index = array.findIndex(item => item.id === id)
  const newIndex = index + delta
  if (newIndex < 0 || newIndex >= array.length)
    throw new Error(`Invalid new index ${newIndex} for category ${category}`)

  array.splice(newIndex, 0, array.splice(index, 1)[0]!)
  items[1] = array

  settingsStore.mutate((state) => {
    array.forEach((item, index) => {
      state.docksCustomOrder[item.id] = index
    })
  })
}

function doesCategoryHaveCustomOrder(category: string): boolean {
  const items = categories.value.find(([cat]) => cat === category)
  if (!items)
    return false
  return items[1].some(item => isInCustomOrder(item.id))
}

function resetCustomOrderForCategory(category: string) {
  const items = categories.value.find(([cat]) => cat === category)
  if (!items)
    return
  settingsStore.mutate((state) => {
    items[1].forEach((item) => {
      delete state.docksCustomOrder[item.id]
    })
  })
}

// --- Keyboard Shortcuts ---
const commandsCtx = props.context.commands
const shortcutOverrides = sharedStateToRef(commandsCtx.shortcutOverrides)
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

function clearShortcut(commandId: string) {
  commandsCtx.shortcutOverrides.mutate((state: Record<string, DevToolsCommandKeybinding[]>) => {
    state[commandId] = []
  })
}

function resetShortcut(commandId: string) {
  commandsCtx.shortcutOverrides.mutate((state: Record<string, DevToolsCommandKeybinding[]>) => {
    delete state[commandId]
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

const KNOWN_BROWSER_SHORTCUTS = new Set([
  'Mod+T',
  'Mod+W',
  'Mod+N',
  'Mod+L',
  'Mod+D',
  'Mod+Q',
  'Mod+Shift+T',
  'Mod+Shift+N',
  'Mod+Shift+W',
  'Mod+Shift+Q',
  'Alt+F4',
  'Mod+R',
  'Mod+Shift+R',
  'Mod+F',
])

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

  // Browser / OS conflict
  if (KNOWN_BROWSER_SHORTCUTS.has(key)) {
    warnings.push('This shortcut conflicts with a common browser shortcut')
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
  commandsCtx.shortcutOverrides.mutate((state: Record<string, DevToolsCommandKeybinding[]>) => {
    state[editorCommandId.value!] = [{ key: editorComposedKey.value }]
  })
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

// --- Reset ---
function resetSettings() {
  // eslint-disable-next-line no-alert
  if (confirm('Reset all dock settings to defaults?')) {
    settingsStore.mutate(() => {
      return DEFAULT_STATE_USER_SETTINGS()
    })
  }
}
</script>

<template>
  <div class="h-full w-full overflow-hidden flex flex-col">
    <!-- Tab bar -->
    <div class="flex items-center border-b border-base px-6 shrink-0">
      <button
        v-for="tab of tabs"
        :key="tab.id"
        class="flex items-center gap-1.5 px-4 py-3 text-sm transition-colors relative"
        :class="activeTab === tab.id
          ? 'op100 text-primary'
          : 'op50 hover:op80'"
        @click="activeTab = tab.id"
      >
        <div :class="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
        <div
          v-if="activeTab === tab.id"
          class="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
        />
      </button>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-auto p8">
      <div class="max-w-200 mx-auto">
        <!-- Appearance tab -->
        <template v-if="activeTab === 'appearance'">
          <div class="flex flex-col gap-4">
            <!-- Dock mode -->
            <div v-if="isEmbedded && !isDockPopupOpen" class="flex flex-col gap-2">
              <div class="flex flex-col">
                <span class="text-sm">Dock mode</span>
                <span class="text-xs op50">How the DevTools panel is displayed</span>
              </div>
              <div class="flex items-center gap-1 bg-gray/10 rounded-lg p1 w-fit">
                <button
                  v-for="option of dockModeOptions"
                  :key="option.value"
                  class="flex items-center gap-1.5 px3 py1.5 rounded-md text-sm transition-all"
                  :class="currentDockMode === option.value
                    ? 'bg-base shadow text-primary font-medium'
                    : 'op60 hover:op100 hover:bg-gray/10'"
                  @click="setDockMode(option.value)"
                >
                  <div :class="option.icon" class="w-4 h-4" />
                  {{ option.label }}
                </button>
              </div>
            </div>

            <!-- Show iframe address bar toggle -->
            <label class="flex items-center gap-3 cursor-pointer group">
              <button
                class="w-10 h-6 rounded-full transition-colors relative shrink-0"
                :class="settings.showIframeAddressBar ? 'bg-lime' : 'bg-gray/30'"
                @click="settingsStore.mutate((s) => { s.showIframeAddressBar = !s.showIframeAddressBar })"
              >
                <div
                  class="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  :class="settings.showIframeAddressBar ? 'translate-x-5' : 'translate-x-1'"
                />
              </button>
              <div class="flex flex-col">
                <span class="text-sm">Show iframe address bar</span>
                <span class="text-xs op50">Display navigation controls and URL bar for iframe views</span>
              </div>
            </label>

            <!-- Close on outside click toggle -->
            <label class="flex items-center gap-3 cursor-pointer group">
              <button
                class="w-10 h-6 rounded-full transition-colors relative shrink-0"
                :class="settings.closeOnOutsideClick ? 'bg-lime' : 'bg-gray/30'"
                @click="settingsStore.mutate((s) => { s.closeOnOutsideClick = !s.closeOnOutsideClick })"
              >
                <div
                  class="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  :class="settings.closeOnOutsideClick ? 'translate-x-5' : 'translate-x-1'"
                />
              </button>
              <div class="flex flex-col">
                <span class="text-sm">Close panel on outside click</span>
                <span class="text-xs op50">Close the DevTools panel when clicking outside of it (embedded mode only)</span>
              </div>
            </label>
          </div>

          <!-- Reset -->
          <div class="border-t border-base mt-8 pt-6">
            <button
              class="px-4 py-2 rounded bg-red/10 text-red hover:bg-red/20 transition-colors flex items-center gap-2 text-sm"
              @click="resetSettings"
            >
              <div class="i-ph-arrow-counter-clockwise" />
              Reset All Settings
            </button>
          </div>
        </template>

        <!-- Shortcuts tab -->
        <template v-if="activeTab === 'shortcuts'">
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
                    <kbd
                      v-for="(key, j) of formatKeybinding(kb.key)"
                      :key="j"
                      class="px-1.5 py-0.5 text-[10px] rounded bg-base border border-base op70 font-mono"
                    >
                      {{ key }}
                    </kbd>
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
                  {{ isMac ? '⌘ Cmd' : 'Ctrl' }}
                </button>
                <button
                  v-if="isMac"
                  class="px-3 py-1.5 rounded-md text-xs font-mono border transition-colors"
                  :class="editorCtrl ? 'bg-primary/15 border-primary/30 text-primary' : 'border-base op50 hover:op80'"
                  @click="editorCtrl = !editorCtrl"
                >
                  ⌃ Ctrl
                </button>
                <button
                  class="px-3 py-1.5 rounded-md text-xs font-mono border transition-colors"
                  :class="editorAlt ? 'bg-primary/15 border-primary/30 text-primary' : 'border-base op50 hover:op80'"
                  @click="editorAlt = !editorAlt"
                >
                  {{ isMac ? '⌥ Alt' : 'Alt' }}
                </button>
                <button
                  class="px-3 py-1.5 rounded-md text-xs font-mono border transition-colors"
                  :class="editorShift ? 'bg-primary/15 border-primary/30 text-primary' : 'border-base op50 hover:op80'"
                  @click="editorShift = !editorShift"
                >
                  {{ isMac ? '⇧ Shift' : 'Shift' }}
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

        <!-- Docks tab -->
        <template v-if="activeTab === 'docks'">
          <p class="text-sm op50 mb-4">
            Manage visibility and order of dock entries. Hidden entries will not appear in the dock bar.
          </p>

          <div class="flex flex-col gap-4">
            <template v-for="[category, entries] of categories" :key="category">
              <div
                class="border border-base rounded-lg overflow-hidden transition-opacity"
                :class="settings.docksCategoriesHidden.includes(category) ? 'op40' : ''"
              >
                <!-- Category header -->
                <div
                  class="flex items-center gap-2 px-4 py-3 bg-gray/5 cursor-pointer select-none border-b border-base"
                >
                  <button
                    class="w-5 h-5 flex items-center justify-center rounded transition-colors"
                    :class="settings.docksCategoriesHidden.includes(category) ? 'bg-gray/20' : 'bg-lime/20 text-lime'"
                    @click="toggleCategory(category)"
                  >
                    <div
                      class="transition-transform"
                      :class="settings.docksCategoriesHidden.includes(category) ? 'i-ph-eye-slash text-sm op50' : 'i-ph-check-bold text-xs'"
                    />
                  </button>
                  <span class="font-medium capitalize">{{ getCategoryLabel(category) }}</span>
                  <span class="text-xs op40">({{ entries.length }})</span>
                  <span class="flex-auto" />
                  <button
                    v-if="doesCategoryHaveCustomOrder(category)"
                    class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                    title="Reset custom order"
                    @click="resetCustomOrderForCategory(category)"
                  >
                    <div class="i-ph-arrows-counter-clockwise-duotone text-sm op60" />
                  </button>
                </div>

                <!-- Entries -->
                <div>
                  <div
                    v-for="(dock, index) of entries"
                    :key="dock.id"
                    class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray/5 transition-colors group border-b border-base border-t-0"
                    :class="settings.docksHidden.includes(dock.id) ? 'op40' : ''"
                  >
                    <!-- Visibility toggle -->
                    <button
                      class="w-6 h-6 flex items-center justify-center rounded border border-transparent hover:border-base transition-colors shrink-0"
                      :class="settings.docksHidden.includes(dock.id) ? 'op50' : ''"
                      :title="settings.docksHidden.includes(dock.id) ? 'Show' : 'Hide'"
                      @click="toggleDock(dock.id)"
                    >
                      <div
                        class="w-4 h-4 rounded flex items-center justify-center transition-colors"
                        :class="settings.docksHidden.includes(dock.id) ? 'bg-gray/30' : 'bg-lime/20 text-lime'"
                      >
                        <div
                          v-if="!settings.docksHidden.includes(dock.id)"
                          class="i-ph-check-bold text-xs"
                        />
                      </div>
                    </button>

                    <!-- Icon & Title -->
                    <DockIcon
                      :icon="dock.icon"
                      :title="dock.title"
                      class="w-5 h-5 shrink-0"
                      :class="settings.docksHidden.includes(dock.id) ? 'saturate-0' : ''"
                    />
                    <span
                      class="flex-1 truncate"
                      :class="settings.docksHidden.includes(dock.id) ? 'line-through op60' : ''"
                    >
                      {{ dock.title }}
                    </span>

                    <!-- Order controls -->
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        v-if="index > 0"
                        class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                        title="Move up (higher priority)"
                        @click="moveOrder(category, dock.id, -1)"
                      >
                        <div class="i-ph-caret-up text-sm op60" />
                      </button>
                      <button
                        v-if="index < entries.length - 1"
                        class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                        title="Move down (lower priority)"
                        @click="moveOrder(category, dock.id, 1)"
                      >
                        <div class="i-ph-caret-down text-sm op60" />
                      </button>
                    </div>

                    <!-- Pin toggle -->
                    <button
                      class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray/20 transition-colors shrink-0"
                      :class="settings.docksPinned.includes(dock.id) ? 'text-amber' : 'op40 hover:op70'"
                      :title="settings.docksPinned.includes(dock.id) ? 'Unpin' : 'Pin'"
                      @click="togglePin(dock.id)"
                    >
                      <div
                        :class="settings.docksPinned.includes(dock.id) ? 'i-ph-push-pin-fill rotate--45' : 'i-ph-push-pin'"
                        class="text-base"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
