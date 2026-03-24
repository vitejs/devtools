<script setup lang="ts">
import type { DevToolsClientCommand, DevToolsCommandEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import Fuse from 'fuse.js'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import ViteDevToolsLogo from '../icons/ViteDevTools.vue'
import CommandPaletteItem from './CommandPaletteItem.vue'

const props = defineProps<{
  context: DocksContext
}>()

const commandsCtx = computed(() => props.context.commands)
const show = computed({
  get: () => commandsCtx.value.paletteOpen,
  set: (v) => { commandsCtx.value.paletteOpen = v },
})

const search = ref('')
const selectedIndex = ref(0)
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const visible = ref(false)

// Breadcrumb stack for sub-command drill-down
const breadcrumb = ref<Array<{ title: string, items: DevToolsCommandEntry[] }>>([])

// Flattened items for top-level search (includes children with parent prefix)
interface FlatItem {
  entry: DevToolsCommandEntry
  parentTitle?: string
  searchTitle: string
}

const flattenedItems = computed<FlatItem[]>(() => {
  const result: FlatItem[] = []
  for (const cmd of commandsCtx.value.paletteCommands) {
    result.push({ entry: cmd, searchTitle: cmd.title })
    if (cmd.children && cmd.showInPalette !== 'without-children') {
      for (const child of cmd.children) {
        if (child.showInPalette === false)
          continue
        result.push({
          entry: child as DevToolsCommandEntry,
          parentTitle: cmd.title,
          searchTitle: `${cmd.title} > ${child.title}`,
        })
      }
    }
  }
  return result
})

// Current items: either drilled-down sub-items or root items
const currentFlatItems = computed<FlatItem[]>(() => {
  if (breadcrumb.value.length > 0) {
    const current = breadcrumb.value.at(-1)!
    return current.items.map(entry => ({ entry, searchTitle: entry.title }))
  }
  return flattenedItems.value
})

// Dynamic sub-items from action() return
const dynamicItems = ref<DevToolsClientCommand[] | undefined>()
const activeItems = computed<FlatItem[]>(() => {
  if (dynamicItems.value) {
    return dynamicItems.value.map(entry => ({ entry, searchTitle: entry.title }))
  }
  return currentFlatItems.value
})

const fuse = computed(() => new Fuse(activeItems.value, {
  keys: ['searchTitle', 'entry.description', 'entry.id'],
  distance: 50,
  threshold: 0.4,
}))

const filtered = computed(() => {
  if (!search.value)
    return activeItems.value
  return fuse.value.search(search.value).map(i => i.item)
})

watch(search, () => {
  selectedIndex.value = 0
})

watch(show, (v) => {
  if (v) {
    search.value = ''
    selectedIndex.value = 0
    breadcrumb.value = []
    dynamicItems.value = undefined
    // Trigger enter animation
    requestAnimationFrame(() => {
      visible.value = true
    })
    nextTick(() => searchInput.value?.focus())
  }
  else {
    visible.value = false
  }
})

function moveSelected(delta: number) {
  const len = filtered.value.length
  if (len === 0)
    return
  selectedIndex.value = ((selectedIndex.value + delta) + len) % len
  scrollToItem()
}

function scrollToItem() {
  const item = filtered.value[selectedIndex.value]
  if (!item)
    return
  const el = document.getElementById(`cmd-${item.entry.id}`)
  el?.scrollIntoView({ block: 'nearest' })
}

const loadingId = ref<string | null>(null)

async function enterItem(flatItem: FlatItem) {
  const entry = flatItem.entry

  // If has static children, drill down
  if (entry.children && entry.children.length > 0) {
    breadcrumb.value.push({
      title: entry.title,
      items: entry.children as DevToolsCommandEntry[],
    })
    search.value = ''
    selectedIndex.value = 0
    dynamicItems.value = undefined
    return
  }

  // Client command with action
  if (entry.source === 'client' && entry.action) {
    try {
      const result = await entry.action()
      if (Array.isArray(result)) {
        // Dynamic sub-items
        dynamicItems.value = result
        search.value = ''
        selectedIndex.value = 0
        return
      }
    }
    catch (err) {
      console.error(`[DevTools] Command "${entry.id}" failed:`, err)
    }
    close()
    return
  }

  // Server command
  if (entry.source === 'server') {
    loadingId.value = entry.id
    try {
      await commandsCtx.value.execute(entry.id)
    }
    catch (err) {
      console.error(`[DevTools] Command "${entry.id}" failed:`, err)
    }
    finally {
      loadingId.value = null
    }
    close()
    return
  }

  // Fallback: close
  close()
}

function close() {
  visible.value = false
  // Wait for leave animation
  setTimeout(() => {
    show.value = false
    search.value = ''
    breadcrumb.value = []
    dynamicItems.value = undefined
  }, 150)
}

function goBack() {
  if (dynamicItems.value) {
    dynamicItems.value = undefined
    search.value = ''
    selectedIndex.value = 0
    return
  }
  if (breadcrumb.value.length > 0) {
    breadcrumb.value.pop()
    search.value = ''
    selectedIndex.value = 0
    return
  }
  close()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Backspace' && !search.value && (breadcrumb.value.length > 0 || dynamicItems.value)) {
    e.preventDefault()
    goBack()
  }
}

function onGlobalKeyDown(e: KeyboardEvent) {
  if (!show.value)
    return

  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      e.preventDefault()
      moveSelected(e.key === 'ArrowDown' ? 1 : -1)
      break

    case 'Enter': {
      const item = filtered.value[selectedIndex.value]
      if (item) {
        e.preventDefault()
        enterItem(item)
      }
      break
    }

    case 'Escape': {
      e.preventDefault()
      if (breadcrumb.value.length > 0 || dynamicItems.value)
        goBack()
      else
        close()
      break
    }
  }
}

function getKeybindings(id: string) {
  return commandsCtx.value.getKeybindings(id)
}
</script>

<template>
  <div
    v-if="show"
    class="vite-devtools-command-palette fixed inset-0 z-command-palette"
    @keydown="onGlobalKeyDown"
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-white/50 dark:bg-black/30 transition-opacity duration-150 "
      :class="visible ? 'opacity-100 backdrop-blur-1' : 'opacity-0 backdrop-blur-0'"
      @click="close"
    />
    <!-- Dialog -->
    <div class="absolute inset-0 flex items-start justify-center relative pt-[20vh] pointer-events-none">
      <div
        class="flex flex-col transition-all duration-150"
        :class="visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-98 -translate-y-2'"
      >
        <ViteDevToolsLogo class="absolute top--32px left-5px w-60 pointer-events-none" />
        <div
          class="w-full w-lg bg-base border border-base rounded-lg shadow-xl pointer-events-auto of-hidden flex flex-col max-h-[60vh]"
        >
          <!-- Header -->
          <header class="border-b border-base flex items-center px-3">
            <!-- Breadcrumb -->
            <template v-if="breadcrumb.length > 0">
              <button
                v-for="(crumb, i) in breadcrumb"
                :key="i"
                class="text-xs op60 hover:op80 mr-1 flex items-center gap-0.5"
                @click="breadcrumb.splice(i); search = ''; selectedIndex = 0"
              >
                {{ crumb.title }}
                <span class="op40">&rsaquo;</span>
              </button>
            </template>
            <input
              ref="searchInput"
              v-model="search"
              class="flex-1 bg-transparent py-3 outline-none text-sm text-base"
              placeholder="Type a command..."
              @keydown="onKeyDown"
            >
          </header>

          <!-- Items -->
          <div class="flex-1 of-y-auto p-1.5">
            <CommandPaletteItem
              v-for="(item, idx) of filtered"
              :key="item.entry.id"
              :entry="item.entry"
              :parent-title="item.parentTitle"
              :show-parent-title="!breadcrumb.length"
              :selected="selectedIndex === idx"
              :loading="loadingId === item.entry.id"
              :keybindings="getKeybindings(item.entry.id)"
              @select="selectedIndex = idx"
              @activate="enterItem(item)"
            />

            <div v-if="!filtered.length" class="py-8 flex flex-col items-center justify-center gap-2 op50 text-sm">
              <div class="i-ph-magnifying-glass-duotone w-6 h-6" />
              <div v-if="search">
                No results for "<strong class="text-primary op100">{{ search }}</strong>"
              </div>
              <div v-else>
                No commands available
              </div>
            </div>
          </div>

          <!-- Footer -->
          <footer class="border-t border-base flex items-center justify-between gap-4 px-3 py-1.5 text-[10px] op50">
            <div class="flex items-center gap-1.5">
              <kbd class="px-1 py-0.5 rounded border border-base bg-base font-mono">&darr;&uarr;</kbd>
              <span>navigate</span>
            </div>
            <div class="flex items-center gap-1.5">
              <kbd class="px-1 py-0.5 rounded border border-base bg-base font-mono">esc</kbd>
              <span>{{ breadcrumb.length > 0 || dynamicItems ? 'back' : 'close' }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <kbd class="px-1 py-0.5 rounded border border-base bg-base font-mono">&crarr;</kbd>
              <span>select</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>
