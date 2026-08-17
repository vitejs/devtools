<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type DetectionStatus = 'checking' | 'detected' | 'vite-detected' | 'not-detected' | 'restricted' | 'error'

interface StatusContent {
  description: string
  label: string
  tone: 'ready' | 'active' | 'muted'
}

const STATUS_CONTENT: Record<DetectionStatus, StatusContent> = {
  'checking': {
    label: 'Checking',
    description: 'Checking current page\u2026',
    tone: 'muted',
  },
  'detected': {
    label: 'Ready',
    description: 'Open DevTools and select the Vite tab.',
    tone: 'ready',
  },
  'vite-detected': {
    label: 'Vite app detected',
    description: 'Enable Vite DevTools to inspect this app.',
    tone: 'active',
  },
  'not-detected': {
    label: 'Not detected',
    description: 'Open an app running on the Vite dev server.',
    tone: 'muted',
  },
  'restricted': {
    label: 'Restricted',
    description: 'Chrome doesn\u2019t allow extensions to inspect this page.',
    tone: 'muted',
  },
  'error': {
    label: 'Unavailable',
    description: 'Refresh the page and try again.',
    tone: 'muted',
  },
}

const status = ref<DetectionStatus>('checking')
const statusContent = computed(() => STATUS_CONTENT[status.value])
const statusBadgeClass = computed(() => ({
  'status-ready': statusContent.value.tone === 'ready',
  'bg-active color-active': statusContent.value.tone === 'active',
  'bg-active color-base': statusContent.value.tone === 'muted',
}))
const logoUrl = chrome.runtime.getURL('icons/48.png')

onMounted(async () => {
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'vite-devtools:detect-active-tab',
    })

    status.value = typeof result === 'string' && result in STATUS_CONTENT
      ? result as DetectionStatus
      : 'error'
  }
  catch {
    status.value = 'error'
  }
})
</script>

<template>
  <main class="w-80 bg-base font-sans color-base">
    <header class="flex items-center px-3.5 pb-3 pt-3.5">
      <img :src="logoUrl" alt="" class="h-6 w-6" width="24" height="24">
      <h1 class="m-0 ml-2 text-sm font-600 leading-5">
        Vite DevTools
      </h1>

      <span
        class="ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-600 leading-none"
        :class="statusBadgeClass"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        {{ statusContent.label }}
      </span>
    </header>

    <section
      class="px-3.5 pb-4 pt-1"
      role="status"
      aria-live="polite"
    >
      <p class="m-0 text-xs leading-4.5 op55">
        {{ statusContent.description }}
      </p>
    </section>

    <nav class="flex justify-end gap-3 border-t border-base px-3.5 py-2.5" aria-label="Resources">
      <a
        href="https://devtools.vite.dev/"
        target="_blank"
        rel="noreferrer"
        class="flex items-center gap-1.5 rounded color-base no-underline op55 outline-none transition hover:op100 focus-visible:ring-2 focus-visible:ring-primary-500/40"
      >
        <span class="i-ph-book-open-text h-3.5 w-3.5" aria-hidden="true" />
        <span class="text-xs">Docs</span>
      </a>
      <a
        href="https://github.com/vitejs/devtools"
        target="_blank"
        rel="noreferrer"
        class="flex items-center gap-1.5 rounded color-base no-underline op55 outline-none transition hover:op100 focus-visible:ring-2 focus-visible:ring-primary-500/40"
      >
        <span class="i-ph-github-logo h-3.5 w-3.5" aria-hidden="true" />
        <span class="text-xs">GitHub</span>
      </a>
    </nav>
  </main>
</template>
