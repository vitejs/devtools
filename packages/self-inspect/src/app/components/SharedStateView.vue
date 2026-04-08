<script setup lang="ts">
import { JsonEditor } from '@visual-json/vue'
import { nanoid } from '@vitejs/devtools-kit/utils/nanoid'
import { computed, ref, shallowRef, watch } from 'vue'
import { useRpc } from '../composables/rpc'

const props = defineProps<{
  keys: string[]
}>()

const rpc = useRpc()
const showInternal = ref(false)
const selectedKey = ref<string>()

const filteredKeys = computed(() => {
  if (showInternal.value)
    return props.keys
  return props.keys.filter(key => !key.startsWith('devtoolskit:internal:') && !key.startsWith('__'))
})
const stateValue = shallowRef<any>()
const loading = ref(false)

async function loadState(key: string) {
  loading.value = true
  try {
    stateValue.value = await rpc.value.call('devtoolskit:internal:rpc:server-state:get', key)
  }
  finally {
    loading.value = false
  }
}

watch(selectedKey, (key) => {
  stateValue.value = undefined
  if (key)
    loadState(key)
})

function selectKey(key: string) {
  selectedKey.value = key
}

async function handleChange(value: any) {
  if (!selectedKey.value)
    return
  const syncId = nanoid()
  stateValue.value = value
  await rpc.value.call('devtoolskit:internal:rpc:server-state:set', selectedKey.value, value, syncId)
}
</script>

<template>
  <div flex="~" h-full of-hidden>
    <!-- Keys list -->
    <div w-60 shrink-0 border="r base" flex="~ col" of-hidden>
      <div px3 py2 text-xs op60 border="b base" flex="~ items-center justify-between">
        <span>{{ filteredKeys.length }} shared states</span>
        <label flex="~ items-center gap-1" cursor-pointer>
          <input v-model="showInternal" type="checkbox">
          <span>Internal</span>
        </label>
      </div>
      <div flex-1 of-auto>
        <button
          v-for="key in filteredKeys" :key="key"
          block w-full text-left
          px3 py2 text-sm font-mono
          border="b base"
          hover:bg-active transition-colors
          :class="selectedKey === key ? 'bg-active! text-primary' : 'op70'"
          @click="selectKey(key)"
        >
          {{ key }}
        </button>
      </div>
    </div>

    <!-- State viewer/editor -->
    <div flex-1 of-auto>
      <div v-if="!selectedKey" flex="~ items-center justify-center" h-full op40 text-sm>
        Select a shared state to inspect
      </div>
      <VisualLoading v-else-if="loading" />
      <div v-else-if="stateValue !== undefined" h-full>
        <JsonEditor
          :value="stateValue"
          height="100%"
          @change="handleChange"
        />
      </div>
    </div>
  </div>
</template>
