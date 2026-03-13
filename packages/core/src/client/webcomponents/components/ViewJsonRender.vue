<script setup lang="ts">
import type { Spec } from '@json-render/core'
import type { DevToolsViewJsonRender } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { JSONUIProvider, Renderer } from '@json-render/vue'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { devtoolsRegistry } from '../json-render/registry'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewJsonRender
}>()

const spec = shallowRef<Spec | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Resolve spec from sharedStateKey or inline spec
async function loadSpec() {
  try {
    if (props.entry.sharedStateKey) {
      const state = await props.context.rpc.sharedState.get(props.entry.sharedStateKey)
      // Set initial value
      spec.value = state.value() as Spec
      // Watch for updates
      state.on('updated', (newValue) => {
        spec.value = newValue as Spec
      })
    }
    else if (props.entry.spec) {
      spec.value = props.entry.spec as unknown as Spec
    }
  }
  catch (e) {
    error.value = String(e)
  }
  finally {
    isLoading.value = false
  }
}

// Action handlers bridge: action names → RPC event calls
// Uses a Proxy so any action name is forwarded to the server as an RPC call
const actionHandlers = new Proxy({} as Record<string, (params: Record<string, unknown>) => Promise<unknown>>, {
  get(_target, actionName: string) {
    return async (params?: Record<string, unknown>) => {
      try {
        await props.context.rpc.callEvent(actionName as any, params as any)
      }
      catch (e) {
        console.error(`[json-render] Action "${actionName}" failed:`, e)
      }
    }
  },
  has() {
    return true
  },
})

// Initial state from spec
const initialState = computed(() => {
  if (spec.value && 'state' in spec.value) {
    return (spec.value as any).state as Record<string, unknown>
  }
  return {}
})

onMounted(loadSpec)

// Re-load when entry changes
watch(() => props.entry.sharedStateKey, loadSpec)
watch(() => props.entry.spec, () => {
  if (!props.entry.sharedStateKey && props.entry.spec) {
    spec.value = props.entry.spec as unknown as Spec
  }
})
</script>

<template>
  <div class="vite-devtools-view-json-render w-full h-full overflow-auto" style="padding: 16px;">
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
      <Renderer :spec="spec" :registry="devtoolsRegistry" />
    </JSONUIProvider>
    <div v-else style="display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.5; font-size: 13px;">
      No spec provided
    </div>
  </div>
</template>
