<script setup lang="ts">
import type { Spec } from '@json-render/core'
import type { DevToolsViewJsonRender } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { JSONUIProvider, Renderer } from '@json-render/vue'
import { useDebounceFn, useSessionStorage } from '@vueuse/core'
import { computed, markRaw, onMounted, provide, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { DOCK_ENTRY_ID_KEY } from '../../json-render/composables/dock-entry-id'
import { devtoolsRegistry, UnsupportedComponent } from '../../json-render/registry'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewJsonRender
}>()

/**
 * Descendants (e.g. `useUncontrolledValue`) `inject()` this to scope
 * session-persisted state to "this dock" — the entry's own id, stable for
 * this component instance's lifetime (`ViewEntry` re-keys on entry change).
 */
provide(DOCK_ENTRY_ID_KEY, props.entry.id)

const spec = shallowRef<Spec | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

/**
 * Restores/persists the scroll position of this dock's own view, per tab,
 * across a reload — keyed by the dock entry id so switching docks doesn't
 * bleed one dock's scroll into another's.
 */
const scrollContainer = useTemplateRef<HTMLElement>('scrollContainer')
const scrollTop = useSessionStorage(`vite-devtools-scroll:${props.entry.id}`, 0)
onMounted(() => {
  if (scrollContainer.value)
    scrollContainer.value.scrollTop = scrollTop.value
})
const persistScrollTop = useDebounceFn(() => {
  scrollTop.value = scrollContainer.value?.scrollTop ?? 0
}, 200)

// Resolve spec from entry.ui._stateKey
async function loadSpec() {
  try {
    const stateKey = props.entry.ui?._stateKey
    if (stateKey) {
      const state = await props.context.rpc.sharedState.get(stateKey as any)
      spec.value = state.value() as unknown as Spec
      state.on('updated', (newValue) => {
        spec.value = newValue as unknown as Spec
      })
    }
  }
  catch (e) {
    error.value = String(e)
  }
  finally {
    isLoading.value = false
  }
}

// Action handlers bridge: action names → RPC calls
// Use a plain object cache instead of a Proxy to avoid issues with Vue's
// reactivity system and Promise detection accessing `then`/`catch` on the proxy
const actionHandlerCache = new Map<string, (params?: Record<string, unknown>) => Promise<void>>()
function getActionHandler(actionName: string) {
  let handler = actionHandlerCache.get(actionName)
  if (!handler) {
    handler = async (params?: Record<string, unknown>) => {
      try {
        await props.context.rpc.call(actionName as any, params as any)
      }
      catch (e) {
        console.error(`[json-render] Action "${actionName}" failed:`, e)
      }
    }
    actionHandlerCache.set(actionName, handler)
  }
  return handler
}
const actionHandlers = markRaw(new Proxy({} as Record<string, (params: Record<string, unknown>) => Promise<unknown>>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'symbol')
      return undefined
    // Avoid intercepting Promise/JS internals that Vue reactivity checks
    if (prop === 'then' || prop === 'catch' || prop === 'finally')
      return undefined
    return getActionHandler(prop)
  },
  has(_target, prop: string | symbol) {
    if (typeof prop === 'symbol')
      return false
    if (prop === 'then' || prop === 'catch' || prop === 'finally')
      return false
    return true
  },
}))

// Initial state from spec
const initialState = computed(() => {
  if (spec.value && 'state' in spec.value) {
    return (spec.value as any).state as Record<string, unknown>
  }
  return {}
})

onMounted(loadSpec)

// Re-load when entry changes
watch(() => props.entry.ui?._stateKey, loadSpec)
</script>

<template>
  <div ref="scrollContainer" class="vite-devtools-view-json-render w-full h-full overflow-auto" style="padding: 16px; scrollbar-gutter: stable;" @scroll="persistScrollTop">
    <div v-if="isLoading" style="display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.5; font-size: 13px;">
      Loading...
    </div>
    <div v-else-if="error" style="padding: 16px; color: rgb(239,68,68); font-size: 13px;">
      Error loading spec: {{ error }}
    </div>
    <JSONUIProvider
      v-else-if="spec"
      :registry="devtoolsRegistry"
      :handlers="actionHandlers"
      :initial-state="initialState"
    >
      <Renderer :spec="spec" :registry="devtoolsRegistry" :fallback="UnsupportedComponent" />
    </JSONUIProvider>
    <div v-else style="display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.5; font-size: 13px;">
      No spec provided
    </div>
  </div>
</template>
