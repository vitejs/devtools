<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DockEntryState } from '@vitejs/devtools-kit/client'
import { onClickOutside } from '@vueuse/core'
import { computed, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  entry: DevToolsDockEntry | null
  entryState: DockEntryState | null
  position: { x: number, y: number }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'hide', entryId: string): void
  (e: 'toggleAddressBar', entryId: string): void
}>()

const menuRef = useTemplateRef<HTMLDivElement>('menuRef')
const isVisible = computed(() => props.entry !== null)

onClickOutside(menuRef, () => {
  emit('close')
})

// Close on escape key
watch(isVisible, (visible) => {
  if (visible) {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        emit('close')
        window.removeEventListener('keydown', handler)
      }
    }
    window.addEventListener('keydown', handler)
  }
})

// Menu position - ensure it stays within viewport
const menuStyle = computed(() => {
  const { x, y } = props.position
  const menuWidth = 180
  const menuHeight = 150

  // Adjust position to keep menu in viewport
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10)
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10)

  return {
    left: `${Math.max(10, adjustedX)}px`,
    top: `${Math.max(10, adjustedY)}px`,
  }
})

// Check if entry is an iframe type (supports refresh)
const isIframe = computed(() => props.entry?.type === 'iframe')

// Check if entry has an iframe element mounted
const hasIframe = computed(() => !!props.entryState?.domElements.iframe)

// Check if address bar is currently shown
const isAddressBarVisible = computed(() => props.entryState?.settings.showAddressBar ?? false)

function refreshIframe() {
  const iframe = props.entryState?.domElements.iframe
  if (iframe) {
    // Refresh by reassigning src
    const currentSrc = iframe.src
    iframe.src = ''
    // Use setTimeout to ensure the src is cleared before reassigning
    setTimeout(() => {
      iframe.src = currentSrc
    }, 0)
  }
  emit('close')
}

function hideFromDock() {
  if (props.entry) {
    emit('hide', props.entry.id)
  }
  emit('close')
}

function openInNewTab() {
  if (props.entry?.type === 'iframe') {
    window.open(props.entry.url, '_blank')
  }
  emit('close')
}

function copyUrl() {
  if (props.entry?.type === 'iframe') {
    navigator.clipboard.writeText(props.entry.url)
  }
  emit('close')
}

function toggleAddressBar() {
  if (props.entry) {
    emit('toggleAddressBar', props.entry.id)
  }
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isVisible"
        ref="menuRef"
        class="fixed z-[10000] min-w-44 py-1 rounded-lg bg-[#1a1a1a] border border-[#333] shadow-2xl"
        :style="menuStyle"
      >
        <!-- Header with entry title -->
        <div class="px-3 py-1.5 text-xs text-[#888] border-b border-[#333] truncate">
          {{ entry?.title }}
        </div>

        <!-- Iframe-specific actions -->
        <template v-if="isIframe">
          <button
            class="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#333] transition-colors text-left text-[#ccc]"
            :class="!hasIframe ? 'opacity-50 cursor-not-allowed' : ''"
            :disabled="!hasIframe"
            @click="refreshIframe"
          >
            <div class="i-ph:arrow-clockwise w-4 h-4 flex-none op70" />
            <span class="text-sm">Refresh</span>
          </button>

          <button
            class="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#333] transition-colors text-left text-[#ccc]"
            @click="openInNewTab"
          >
            <div class="i-ph:arrow-square-out w-4 h-4 flex-none op70" />
            <span class="text-sm">Open in new tab</span>
          </button>

          <button
            class="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#333] transition-colors text-left text-[#ccc]"
            @click="copyUrl"
          >
            <div class="i-ph:copy w-4 h-4 flex-none op70" />
            <span class="text-sm">Copy URL</span>
          </button>

          <button
            class="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#333] transition-colors text-left text-[#ccc]"
            @click="toggleAddressBar"
          >
            <div class="w-4 h-4 flex-none op70" :class="isAddressBarVisible ? 'i-ph:eye-slash' : 'i-ph:address-book'" />
            <span class="text-sm">{{ isAddressBarVisible ? 'Hide' : 'Show' }} address bar</span>
          </button>

          <div class="my-1 border-t border-[#333]" />
        </template>

        <!-- Common actions -->
        <button
          class="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#333] transition-colors text-left text-red-400"
          @click="hideFromDock"
        >
          <div class="i-ph:eye-slash w-4 h-4 flex-none op70" />
          <span class="text-sm">Hide from dock</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
