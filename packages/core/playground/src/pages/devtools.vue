<script setup lang="ts">
import type { DevToolsMessageLevel } from '@vitejs/devtools-kit'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'
import { onMounted, ref, shallowRef } from 'vue'

const client = shallowRef<Awaited<ReturnType<typeof getDevToolsRpcClient>> | null>(null)
const isTrusted = ref<boolean | null>(null)
const counterState = shallowRef<any>(undefined)

// Message form
const messageMessage = ref('Test message')
const messageLevel = ref<DevToolsMessageLevel>('info')
const messageCategory = ref('debug')
const messageLabels = ref('')
const messageNotify = ref(false)
const messageStatus = ref<'idle' | 'loading'>('idle')
const messageId = ref('')
const messageDescription = ref('')
const messageStacktrace = ref('')
const messageAutoDismiss = ref<number>()
const messageAutoDelete = ref<number>()

// Update form
const updateId = ref('')
const updateMessage = ref('')
const updateLevel = ref<DevToolsMessageLevel>('info')
const updateStatus = ref<'idle' | 'loading'>('idle')

const levels: DevToolsMessageLevel[] = ['info', 'warn', 'error', 'success', 'debug']

onMounted(async () => {
  // Playground page lives outside the `/__devtools/` mount, so resolve the
  // connection meta against the explicit Vite DevTools base.
  const rpc = await getDevToolsRpcClient({ baseURL: DEVTOOLS_MOUNT_PATH })
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

async function addMessage() {
  if (!client.value)
    return
  await client.value.call('devtoolskit:internal:messages:add', {
    message: messageMessage.value,
    level: messageLevel.value,
    category: messageCategory.value || undefined,
    labels: messageLabels.value ? messageLabels.value.split(',').map(l => l.trim()) : undefined,
    notify: messageNotify.value,
    status: messageStatus.value === 'loading' ? 'loading' : undefined,
    id: messageId.value || undefined,
    description: messageDescription.value || undefined,
    stacktrace: messageStacktrace.value || undefined,
    autoDismiss: messageAutoDismiss.value,
    autoDelete: messageAutoDelete.value,
  })
}

async function updateMessageEntry() {
  if (!client.value || !updateId.value)
    return
  await client.value.call('devtoolskit:internal:messages:update', updateId.value, {
    message: updateMessage.value || undefined,
    level: updateLevel.value,
    status: updateStatus.value === 'loading' ? 'loading' : undefined,
  })
}

async function clearMessages() {
  if (!client.value)
    return
  await client.value.call('devtoolskit:internal:messages:clear')
}

async function addLoadingThenResolve() {
  if (!client.value)
    return
  const id = `loading-test-${Date.now()}`
  await client.value.call('devtoolskit:internal:messages:add', {
    id,
    message: 'Processing something...',
    level: 'info',
    status: 'loading',
    notify: true,
    category: 'test',
  })
  setTimeout(async () => {
    await client.value!.call('devtoolskit:internal:messages:update', id, {
      message: 'Processing complete!',
      level: 'success',
      status: 'idle',
      notify: true,
      autoDismiss: 3000,
    })
  }, 2000)
}

async function addBatchMessages() {
  if (!client.value)
    return
  for (const level of levels) {
    await client.value.call('devtoolskit:internal:messages:add', {
      message: `Sample ${level} message`,
      level,
      category: 'batch',
      labels: ['sample'],
    })
  }
}

async function addNotification(msg: string, level: DevToolsMessageLevel) {
  if (!client.value)
    return
  await client.value.call('devtoolskit:internal:messages:add', {
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
        <button btn-action-sm @click="addBatchMessages()">
          <div i-ph-list-plus-duotone />
          Add All Levels
        </button>
        <button btn-action-sm text-red @click="clearMessages()">
          <div i-ph-trash-duotone />
          Clear All
        </button>
      </div>
    </section>

    <!-- Add Message -->
    <section mb6 border="~ base" rounded-lg p3>
      <h2 text-sm font-semibold mb2>
        Add Message
      </h2>
      <div grid="~ cols-2 gap-2" text-sm>
        <label flex="~ col gap-1">
          <span op50 text-xs>Message</span>
          <input v-model="messageMessage" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Level</span>
          <select v-model="messageLevel" border="~ base" rounded px2 py1 text-sm bg-transparent>
            <option v-for="l of levels" :key="l" :value="l">
              {{ l }}
            </option>
          </select>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Category</span>
          <input v-model="messageCategory" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Labels (comma-separated)</span>
          <input v-model="messageLabels" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>ID (for dedup)</span>
          <input v-model="messageId" placeholder="auto" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Status</span>
          <select v-model="messageStatus" border="~ base" rounded px2 py1 text-sm bg-transparent>
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
          <textarea v-model="messageDescription" rows="2" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none resize-y />
        </label>
        <label flex="~ col gap-1" col-span-2>
          <span op50 text-xs>Stacktrace</span>
          <textarea v-model="messageStacktrace" rows="3" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none resize-y font-mono />
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Auto Dismiss</span>
          <input v-model="messageAutoDismiss" type="number" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
        <label flex="~ col gap-1">
          <span op50 text-xs>Auto Delete</span>
          <input v-model="messageAutoDelete" type="number" border="~ base" rounded px2 py1 text-sm bg-transparent outline-none>
        </label>
      </div>
      <div flex items-center gap-3 mt2>
        <label flex items-center gap-1 text-xs>
          <input v-model="messageNotify" type="checkbox">
          Notify (toast)
        </label>
        <button btn-action-sm ml-auto @click="addMessage">
          <div i-ph-paper-plane-tilt-duotone />
          Add Message
        </button>
      </div>
    </section>

    <!-- Update Message -->
    <section mb6 border="~ base" rounded-lg p3>
      <h2 text-sm font-semibold mb2>
        Update Message by ID
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
        <button btn-action-sm @click="updateMessageEntry">
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
