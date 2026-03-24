<script setup lang="ts">
import type { DevToolsLogLevel } from '@vitejs/devtools-kit'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'
import { onMounted, ref, shallowRef } from 'vue'

const client = shallowRef<Awaited<ReturnType<typeof getDevToolsRpcClient>> | null>(null)
const isTrusted = ref<boolean | null>(null)
const counterState = shallowRef<any>(undefined)

// Log form
const logMessage = ref('Test log message')
const logLevel = ref<DevToolsLogLevel>('info')
const logCategory = ref('debug')
const logLabels = ref('')
const logNotify = ref(false)
const logStatus = ref<'idle' | 'loading'>('idle')
const logId = ref('')
const logDescription = ref('')
const logStacktrace = ref('')

// Update form
const updateId = ref('')
const updateMessage = ref('')
const updateLevel = ref<DevToolsLogLevel>('info')
const updateStatus = ref<'idle' | 'loading'>('idle')

const levels: DevToolsLogLevel[] = ['info', 'warn', 'error', 'success', 'debug']

onMounted(async () => {
  const rpc = await getDevToolsRpcClient()
  client.value = rpc

  isTrusted.value = rpc.isTrusted
  rpc.events.on('rpc:is-trusted:updated', (v) => {
    isTrusted.value = v
  })

  const state = await rpc.sharedState.get('counter')
  counterState.value = state.value()
  state.on('updated', (v) => {
    counterState.value = v
  })
})

async function addLog() {
  if (!client.value)
    return
  await client.value.call('devtoolskit:internal:logs:add', {
    message: logMessage.value,
    level: logLevel.value,
    category: logCategory.value || undefined,
    labels: logLabels.value ? logLabels.value.split(',').map(l => l.trim()) : undefined,
    notify: logNotify.value,
    status: logStatus.value === 'loading' ? 'loading' : undefined,
    id: logId.value || undefined,
    description: logDescription.value || undefined,
    stacktrace: logStacktrace.value || undefined,
  })
}

async function updateLog() {
  if (!client.value || !updateId.value)
    return
  await client.value.call('devtoolskit:internal:logs:update', updateId.value, {
    message: updateMessage.value || undefined,
    level: updateLevel.value,
    status: updateStatus.value === 'loading' ? 'loading' : undefined,
  })
}

async function clearLogs() {
  if (!client.value)
    return
  await client.value.call('devtoolskit:internal:logs:clear')
}

async function addLoadingThenResolve() {
  if (!client.value)
    return
  const id = `loading-test-${Date.now()}`
  await client.value.call('devtoolskit:internal:logs:add', {
    id,
    message: 'Processing something...',
    level: 'info',
    status: 'loading',
    notify: true,
    category: 'test',
  })
  setTimeout(async () => {
    await client.value!.call('devtoolskit:internal:logs:update', id, {
      message: 'Processing complete!',
      level: 'success',
      status: 'idle',
      notify: true,
      autoDismiss: 3000,
    })
  }, 2000)
}

async function addBatchLogs() {
  if (!client.value)
    return
  for (const level of levels) {
    await client.value.call('devtoolskit:internal:logs:add', {
      message: `Sample ${level} log`,
      level,
      category: 'batch',
      labels: ['sample'],
    })
  }
}

async function addNotification(msg: string, level: DevToolsLogLevel) {
  if (!client.value)
    return
  await client.value.call('devtoolskit:internal:logs:add', {
    message: msg,
    level,
    notify: true,
    autoDismiss: 3000,
  })
}

function incrementCounter() {
  if (!client.value)
    return
  client.value.sharedState.get('counter').then((state) => {
    state.mutate((s) => {
      s.count++
    })
  })
}
</script>

<template>
  <div max-w-180 mx-auto p6 text-left>
    <h1 text-xl font-bold mb4>
      DevTools Debug Dashboard
    </h1>

    <!-- Status bar -->
    <div flex gap-2 items-center mb6 px3 py2 bg-secondary rounded-lg text-sm>
      <DisplayBadge :text="isTrusted === null ? 'connecting' : isTrusted ? 'trusted' : 'untrusted'" />
      <span op30>|</span>
      <span font-mono>counter: {{ counterState?.count ?? '-' }}</span>
      <button btn-action-sm ml-auto @click="incrementCounter">
        ++
      </button>
    </div>

    <!-- Quick Actions -->
    <section mb6>
      <h2 text-sm font-semibold mb2>
        Quick Actions
      </h2>
      <div flex="~ wrap gap-2">
        <button btn-action-sm @click="addNotification('URL copied!', 'success')">
          <div i-ph-check-circle-duotone text-green />
          Toast: Success
        </button>
        <button btn-action-sm @click="addNotification('Something went wrong', 'error')">
          <div i-ph-x-circle-duotone text-red />
          Toast: Error
        </button>
        <button btn-action-sm @click="addNotification('Check this out', 'warn')">
          <div i-ph-warning-duotone text-amber />
          Toast: Warning
        </button>
        <button btn-action-sm @click="addLoadingThenResolve()">
          <div i-ph-spinner-gap-duotone />
          Loading -> Resolve
        </button>
        <button btn-action-sm @click="addBatchLogs()">
          <div i-ph-list-plus-duotone />
          Add All Levels
        </button>
        <button btn-action-sm text-red @click="clearLogs()">
          <div i-ph-trash-duotone />
          Clear All
        </button>
      </div>
    </section>

    <!-- Add Log -->
    <section mb6 border="~ base" rounded-lg p3>
      <h2 text-sm font-semibold mb2>
        Add Log
      </h2>
      <div grid="~ cols-2 gap-2" text-sm>
        <label flex="~ col gap-1">
          <span op50 text-xs>Message</span>
          <input v-model="logMessage" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Level</span>
          <select v-model="logLevel" border="~ base" rounded px2 py1 text-sm bg-transparent>
            <option v-for="l of levels" :key="l" :value="l">
              {{ l }}
            </option>
          </select>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Category</span>
          <input v-model="logCategory" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Labels (comma-separated)</span>
          <input v-model="logLabels" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>ID (for dedup)</span>
          <input v-model="logId" placeholder="auto" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Status</span>
          <select v-model="logStatus" border="~ base" rounded px2 py1 text-sm bg-transparent>
            <option value="idle">
              idle
            </option>
            <option value="loading">
              loading
            </option>
          </select>
        </label>
        <label flex="~ col gap-1" col-span-2>
          <span op50 text-xs>Description</span>
          <textarea v-model="logDescription" rows="2" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none resize-y />
        </label>
        <label flex="~ col gap-1" col-span-2>
          <span op50 text-xs>Stacktrace</span>
          <textarea v-model="logStacktrace" rows="3" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none resize-y font-mono />
        </label>
      </div>
      <div flex items-center gap-3 mt2>
        <label flex items-center gap-1 text-xs>
          <input v-model="logNotify" type="checkbox">
          Notify (toast)
        </label>
        <button btn-action-sm ml-auto @click="addLog">
          <div i-ph-paper-plane-tilt-duotone />
          Add Log
        </button>
      </div>
    </section>

    <!-- Update Log -->
    <section mb6 border="~ base" rounded-lg p3>
      <h2 text-sm font-semibold mb2>
        Update Log by ID
      </h2>
      <div grid="~ cols-2 gap-2" text-sm>
        <label flex="~ col gap-1">
          <span op50 text-xs>Entry ID</span>
          <input v-model="updateId" placeholder="entry id" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>New Message</span>
          <input v-model="updateMessage" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Level</span>
          <select v-model="updateLevel" border="~ base" rounded px2 py1 text-sm bg-transparent>
            <option v-for="l of levels" :key="l" :value="l">
              {{ l }}
            </option>
          </select>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Status</span>
          <select v-model="updateStatus" border="~ base" rounded px2 py1 text-sm bg-transparent>
            <option value="idle">
              idle
            </option>
            <option value="loading">
              loading
            </option>
          </select>
        </label>
      </div>
      <div flex justify-end mt2>
        <button btn-action-sm @click="updateLog">
          <div i-ph-pencil-simple-duotone />
          Update
        </button>
      </div>
    </section>

    <!-- Shared State -->
    <section border="~ base" rounded-lg p3>
      <h2 text-sm font-semibold mb2>
        Shared State: counter
      </h2>
      <pre text-xs bg-secondary rounded p2 of-auto font-mono>{{ counterState }}</pre>
      <div flex gap-2 mt2>
        <button btn-action-sm @click="incrementCounter">
          <div i-ph-plus-duotone />
          Increment
        </button>
      </div>
    </section>
  </div>
</template>
