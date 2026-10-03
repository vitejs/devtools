<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// A mock "Nuxt DevTools": a single SPA with its own internal tabs that surfaces
// each tab as a first-class Vite DevTools dock over the `devframe:frame-nav`
// postMessage protocol (devframe 0.7.11). It ships ONLY the ~40-line nav shim
// below — no hub/RPC dependency — and switches views by in-app (soft) state, so
// tab changes never reload the iframe. The `frameId` here must match the anchor
// dock registered in `vite.config.ts`.
const CHANNEL = 'devframe:frame-nav'
const VERSION = 1
const FRAME_ID = 'nuxt'

interface Tab {
  id: string
  title: string
  icon: string
  badge?: string
}

const TABS: Tab[] = [
  { id: 'overview', title: 'Overview', icon: 'ph:gauge-duotone' },
  { id: 'pages', title: 'Pages', icon: 'ph:files-duotone', badge: '4' },
  { id: 'components', title: 'Components', icon: 'ph:puzzle-piece-duotone', badge: '12' },
  { id: 'modules', title: 'Modules', icon: 'ph:plugs-connected-duotone' },
]

const currentId = ref('overview')
const current = computed(() => TABS.find(t => t.id === currentId.value) ?? TABS[0])

// Proof of soft navigation: this component mounts once and its local state
// survives every tab switch (no reload would reset these).
const mountedAt = new Date().toLocaleTimeString()
const switches = ref(0)

let hostOrigin: string | null = null

function tabsSnapshot() {
  return TABS.map((t, order) => ({
    id: t.id,
    title: t.title,
    icon: t.icon,
    navTarget: { path: `/${t.id}` },
    badge: t.badge,
    order,
  }))
}

function post(msg: Record<string, unknown>) {
  if (!hostOrigin)
    return
  window.parent.postMessage(
    { channel: CHANNEL, v: VERSION, frameId: FRAME_ID, from: 'frame', ...msg },
    hostOrigin,
  )
}

function tabIdForPath(path: string) {
  const id = path.replace(/^\//, '')
  return TABS.some(t => t.id === id) ? id : undefined
}

// Select a tab from an internal interaction (user click) and report it so the
// host moves the dock highlight to match.
function selectFromApp(id: string) {
  if (id === currentId.value)
    return
  currentId.value = id
  switches.value++
  post({ type: 'navigated', tabId: id })
}

function onMessage(e: MessageEvent) {
  const d = e.data
  if (!d || d.channel !== CHANNEL || d.v !== VERSION || d.frameId !== FRAME_ID || d.from !== 'host')
    return
  hostOrigin ??= e.origin
  if (d.type === 'hello') {
    post({ type: 'ready', tabs: tabsSnapshot(), current: currentId.value })
  }
  else if (d.type === 'navigate') {
    const id = tabIdForPath(d.navTarget?.path ?? '')
    if (id && id !== currentId.value) {
      currentId.value = id
      switches.value++
    }
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  // Announce on load — race-proof, the host also sends `hello`. Lock to the
  // parent origin when embedded; when opened standalone there is no host.
  if (window.parent !== window) {
    hostOrigin ??= document.referrer ? new URL(document.referrer).origin : '*'
    post({ type: 'ready', tabs: tabsSnapshot(), current: currentId.value })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-white dark:bg-#0a0a0a text-#213547 dark:text-#e5e7eb font-sans">
    <!-- Header -->
    <header class="flex-none flex items-center gap-2 px4 h12 border-b border-black/8 dark:border-white/8">
      <div class="i-vscode-icons-file-type-nuxt text-xl" />
      <span class="font-semibold">Nuxt DevTools</span>
      <span class="text-xs px2 py0.5 rounded-full bg-#00dc82/15 text-#00a866 dark:text-#00dc82">mock</span>
      <span class="ml-auto text-xs op50 font-mono">shared iframe · soft nav</span>
    </header>

    <div class="flex-1 min-h-0 flex">
      <!-- Internal tab rail (in-app navigation) -->
      <nav class="flex-none w-44 border-r border-black/8 dark:border-white/8 p2 flex flex-col gap-1">
        <button
          v-for="tab of TABS"
          :key="tab.id"
          class="flex items-center gap-2 px3 h9 rounded-md text-sm text-left transition-colors"
          :class="tab.id === currentId
            ? 'bg-#00dc82/12 text-#00a866 dark:text-#00dc82'
            : 'hover:bg-black/4 dark:hover:bg-white/6'"
          @click="selectFromApp(tab.id)"
        >
          <div :class="tab.icon" class="text-base" />
          <span>{{ tab.title }}</span>
          <span
            v-if="tab.badge"
            class="ml-auto text-xs px1.5 rounded-full bg-black/8 dark:bg-white/10"
          >{{ tab.badge }}</span>
        </button>
      </nav>

      <!-- Active view -->
      <main class="flex-1 min-w-0 of-auto p6">
        <div class="flex items-center gap-2 mb4">
          <div :class="current.icon" class="text-2xl text-#00a866 dark:text-#00dc82" />
          <h1 class="text-lg font-semibold">
            {{ current.title }}
          </h1>
        </div>

        <p class="text-sm op70 max-w-prose leading-relaxed">
          This is the <b>{{ current.title }}</b> view of the mock Nuxt DevTools. Selecting a tab in
          the Vite DevTools dock bar soft-navigates this shared iframe here — no reload — and clicking
          a tab in the rail on the left moves the DevTools dock highlight to match.
        </p>

        <div class="mt6 grid gap-2 text-xs font-mono op60">
          <div>iframe mounted at: <b>{{ mountedAt }}</b> <span class="op60">(unchanged across tab switches ⇒ no reload)</span></div>
          <div>soft navigations: <b>{{ switches }}</b></div>
          <div>active navTarget: <b>/{{ current.id }}</b></div>
        </div>
      </main>
    </div>
  </div>
</template>
