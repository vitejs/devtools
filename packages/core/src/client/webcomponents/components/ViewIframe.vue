<script setup lang="ts">
import type { DevToolsViewIframe } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { CSSProperties } from 'vue'
import type { PersistedDomViewsManager } from '../utils/PersistedDomViewsManager'
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue'
import { sharedStateToRef } from '../state/docks'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewIframe
  persistedDoms: PersistedDomViewsManager
  iframeStyle?: CSSProperties
}>()

const settings = sharedStateToRef(props.context.docks.settings)
const showAddressBar = computed(() => settings.value.showIframeAddressBar ?? true)
const ADDRESS_BAR_HEIGHT = 50

const isLoading = ref(true)
const isIframeLoading = ref(false)
const viewFrame = useTemplateRef<HTMLDivElement>('viewFrame')
const urlInputRef = useTemplateRef<HTMLInputElement>('urlInput')

// Address bar state
const currentUrl = ref(props.entry.url)
const editingUrl = ref(props.entry.url)
const isEditing = ref(false)

const iframeElement = computed(() => {
  return props.persistedDoms.getHolder(props.entry.id, 'iframe')?.element
})

// Get current page's origin for comparison
const currentPageOrigin = computed(() => {
  try {
    return window.location.origin
  }
  catch {
    return ''
  }
})

// Check if iframe URL is cross-origin
const isCrossOrigin = computed(() => {
  try {
    const url = new URL(currentUrl.value)
    return url.origin !== currentPageOrigin.value
  }
  catch {
    return true // Assume cross-origin if URL parsing fails
  }
})

// Display URL - hides host if same as current page
const displayUrl = computed(() => {
  if (isCrossOrigin.value) {
    return currentUrl.value
  }
  try {
    const url = new URL(currentUrl.value)
    // Show only pathname + search + hash for same-origin
    return url.pathname + url.search + url.hash
  }
  catch {
    return currentUrl.value
  }
})

function updateCurrentUrl() {
  try {
    // Try to get the current URL from the iframe (may fail due to cross-origin)
    const iframe = iframeElement.value
    if (iframe?.contentWindow?.location?.href) {
      currentUrl.value = iframe.contentWindow.location.href
    }
  }
  catch {
    // Cross-origin restriction, keep the last known URL
  }
}

function navigateTo(url: string) {
  const iframe = iframeElement.value
  if (!iframe)
    return

  // Ensure URL has protocol
  let normalizedUrl = url.trim()
  if (normalizedUrl && !normalizedUrl.match(/^https?:\/\//i)) {
    // If it starts with /, treat as same-origin path
    if (normalizedUrl.startsWith('/')) {
      normalizedUrl = `${window.location.origin}${normalizedUrl}`
    }
    else {
      normalizedUrl = `http://${normalizedUrl}`
    }
  }

  currentUrl.value = normalizedUrl
  editingUrl.value = normalizedUrl
  iframe.src = normalizedUrl
  isIframeLoading.value = true
}

function handleUrlSubmit() {
  isEditing.value = false
  if (editingUrl.value !== currentUrl.value) {
    navigateTo(editingUrl.value)
  }
}

function handleUrlFocus() {
  isEditing.value = true
  editingUrl.value = currentUrl.value
  nextTick(() => {
    urlInputRef.value?.select()
  })
}

function handleUrlBlur() {
  isEditing.value = false
  editingUrl.value = currentUrl.value
}

function handleUrlKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isEditing.value = false
    editingUrl.value = currentUrl.value
    urlInputRef.value?.blur()
  }
}

function goBack() {
  try {
    iframeElement.value?.contentWindow?.history.back()
  }
  catch {
    // Cross-origin restriction
  }
}

function refresh() {
  const iframe = iframeElement.value
  if (!iframe)
    return

  isIframeLoading.value = true
  // Reload by reassigning the src
  const src = iframe.src
  iframe.src = ''
  iframe.src = src
}

onMounted(() => {
  if (props.persistedDoms.getHolder(props.entry.id, 'iframe')) {
    updateCurrentUrl()
  }
  const holder = props.persistedDoms.getOrCreateHolder(props.entry.id, 'iframe')
  holder.element.style.boxShadow = 'none'
  holder.element.style.outline = 'none'

  if (!holder.element.src)
    holder.element.src = props.entry.url

  // Listen for iframe load events
  holder.element.addEventListener('load', () => {
    isIframeLoading.value = false
    updateCurrentUrl()
  })

  const entryState = props.context.docks.getStateById(props.entry.id)
  if (entryState)
    entryState.domElements.iframe = holder.element

  watchEffect(() => {
    Object.assign(holder.element.style, props.iframeStyle)
    if (showAddressBar.value) {
      holder.element.style.marginTop = `${ADDRESS_BAR_HEIGHT}px`
      holder.element.style.borderTopLeftRadius = '0px'
      holder.element.style.borderTopRightRadius = '0px'
    }
    else {
      holder.element.style.marginTop = '0px'
      holder.element.style.borderTopLeftRadius = ''
      holder.element.style.borderTopRightRadius = ''
    }
  })

  watch(
    () => props.context.panel,
    () => {
      holder.update()
    },
    { deep: true },
  )

  watchEffect(
    () => {
      holder.element.style.pointerEvents = (props.context.panel.isDragging || props.context.panel.isResizing) ? 'none' : 'auto'
    },
    { flush: 'sync' },
  )

  holder.mount(viewFrame.value!)
  isLoading.value = false
  nextTick(() => {
    holder.update()
  })
})

onUnmounted(() => {
  const holder = props.persistedDoms.getHolder(props.entry.id, 'iframe')
  holder?.unmount()
})
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div
      v-if="showAddressBar"
      class="flex-none px-2 w-full flex items-center gap-1 border rounded-t-md border-base border-b-0 bg-gray/5"
      :style="{ height: `${ADDRESS_BAR_HEIGHT}px` }"
    >
      <!-- Navigation buttons (hidden for cross-origin) -->
      <template v-if="!isCrossOrigin">
        <!-- Back button -->
        <button
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray/15 transition-colors shrink-0"
          title="Back"
          @click="goBack"
        >
          <div class="i-ph-caret-left text-base op60" />
        </button>

        <!-- Refresh button -->
        <button
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray/15 transition-colors shrink-0"
          title="Refresh"
          @click="refresh"
        >
          <div class="i-ph-arrow-clockwise text-base op60" />
        </button>
      </template>

      <!-- Cross-origin badge -->
      <div
        v-else
        class="flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber/10 text-amber border border-amber/20 shrink-0"
        title="Cross-origin iframe - navigation controls unavailable"
      >
        <div class="i-ph-globe text-sm" />
        <span>Cross-Origin</span>
      </div>

      <!-- URL input -->
      <div class="flex-1 flex items-center h-8 px-2.5 rounded bg-gray/10 border border-transparent hover:border-gray/20 focus-within:border-gray/30 transition-colors">
        <input
          ref="urlInput"
          :value="isEditing ? editingUrl : displayUrl"
          type="text"
          class="flex-1 bg-transparent outline-none text-sm font-mono"
          placeholder="Enter URL..."
          :readonly="isCrossOrigin"
          @input="editingUrl = ($event.target as HTMLInputElement).value"
          @focus="handleUrlFocus"
          @blur="handleUrlBlur"
          @keydown="handleUrlKeydown"
          @keydown.enter="handleUrlSubmit"
        >
        <div
          v-if="isIframeLoading"
          class="i-ph-circle-notch text-sm op40 ml-2 shrink-0 animate-spin"
        />
      </div>
    </div>
    <div
      ref="viewFrame"
      class="vite-devtools-view-iframe w-full h-full flex-1 items-center justify-center"
    >
      <div v-if="isLoading" class="op50 z--1">
        Loading iframe...
      </div>
    </div>
  </div>
</template>
