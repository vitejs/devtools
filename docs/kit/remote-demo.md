---
outline: deep
sidebar: false
---

# Remote Connection Demo

<script setup lang="ts">
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { connectRemoteDevTools, parseRemoteConnection } from '@vitejs/devtools-kit/client'
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'

const state = shallowRef<'standalone' | 'connecting' | 'connected' | 'error'>('standalone')
const descriptor = shallowRef<ReturnType<typeof parseRemoteConnection>>(null)
const rpc = shallowRef<DevToolsRpcClient | null>(null)
const errorMessage = shallowRef<string>('')
const docksList = shallowRef<Array<{ id: string, title: string, type: string }>>([])
const connectedAt = shallowRef<number>(0)

const elapsed = shallowRef<string>('0s')
let timer: ReturnType<typeof setInterval> | null = null

const shortToken = computed(() => {
  const token = descriptor.value?.authToken ?? ''
  if (token.length <= 12)
    return token
  return `${token.slice(0, 6)}…${token.slice(-4)}`
})

onMounted(async () => {
  // Safely read location on the client only.
  try {
    descriptor.value = parseRemoteConnection()
  }
  catch (err) {
    state.value = 'error'
    errorMessage.value = (err as Error).message
    return
  }

  if (!descriptor.value) {
    state.value = 'standalone'
    return
  }

  state.value = 'connecting'
  try {
    const client = await connectRemoteDevTools()
    rpc.value = client
    connectedAt.value = Date.now()
    state.value = 'connected'

    timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - connectedAt.value) / 1000)
      elapsed.value = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    }, 1000)

    // Subscribe to the built-in docks shared state to show a live list
    // of dock entries registered on the local dev server.
    const docks = await client.sharedState.get('devtoolskit:internal:docks' as any)
    const toSummary = (entries: any[]) => (entries ?? [])
      .filter(e => e?.type !== '~builtin')
      .map(e => ({ id: String(e.id), title: String(e.title ?? e.id), type: String(e.type) }))
    docksList.value = toSummary(docks.value() as any[])
    docks.on('updated', (entries: any) => {
      docksList.value = toSummary(entries as any[])
    })
  }
  catch (err) {
    state.value = 'error'
    errorMessage.value = (err as Error).message
  }
})

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})
</script>

This page is live. When you open it directly, it tells you how to connect. When you open it through a Vite DevTools dock registered with `remote: true`, it reads the connection descriptor from the URL and talks to your local dev server over WebSocket.

<ClientOnly>

<div v-if="state === 'standalone'" class="remote-demo-card">
  <p><strong>Standalone visit.</strong> No connection descriptor found in the URL.</p>
  <p>To see this page connected to your local dev server, register a remote dock in one of your Vite plugins:</p>

```ts
ctx.docks.register({
  id: 'remote-demo',
  title: 'Remote Demo',
  icon: 'ph:cloud-duotone',
  type: 'iframe',
  url: 'https://YOUR-DOCS-HOST/kit/remote-demo',
  remote: true,
})
```

<p>Open the dock inside DevTools — this same page will load with a descriptor in the URL fragment and connect back to your local server.</p>
</div>

<div v-else-if="state === 'connecting'" class="remote-demo-card">
  <p><strong>Connecting to local dev server…</strong></p>
  <p class="remote-demo-dim">Opening a WebSocket to <code>{{ descriptor?.websocket }}</code> and requesting trust.</p>
</div>

<div v-else-if="state === 'connected'" class="remote-demo-card remote-demo-ok">
  <p><strong>✓ Connected.</strong> Trusted for {{ elapsed }}.</p>
  <table class="remote-demo-table">
    <tbody>
      <tr><th>Dev-server origin</th><td><code>{{ descriptor?.origin }}</code></td></tr>
      <tr><th>WebSocket URL</th><td><code>{{ descriptor?.websocket }}</code></td></tr>
      <tr><th>Auth token</th><td><code>{{ shortToken }}</code></td></tr>
      <tr><th>Descriptor version</th><td><code>v{{ descriptor?.v }}</code></td></tr>
    </tbody>
  </table>

  <h3>Live dock registry</h3>
  <p class="remote-demo-dim">Subscribed to the built-in <code>devtoolskit:internal:docks</code> shared state — this list updates whenever a dock is registered, updated, or removed on the local dev server.</p>
  <ul v-if="docksList.length > 0" class="remote-demo-list">
    <li v-for="dock in docksList" :key="dock.id">
      <code>{{ dock.id }}</code> — {{ dock.title }} <span class="remote-demo-dim">({{ dock.type }})</span>
    </li>
  </ul>
  <p v-else class="remote-demo-dim">No user-registered docks on the local dev server yet.</p>
</div>

<div v-else class="remote-demo-card remote-demo-error">
  <p><strong>Failed to connect.</strong></p>
  <pre>{{ errorMessage }}</pre>
</div>

</ClientOnly>

<style scoped>
.remote-demo-card {
  margin: 1rem 0;
  padding: 1rem 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.remote-demo-ok {
  border-color: var(--vp-c-green-1);
}
.remote-demo-error {
  border-color: var(--vp-c-red-1);
}
.remote-demo-dim {
  color: var(--vp-c-text-2);
  font-size: 0.9em;
}
.remote-demo-table {
  margin: 0.75rem 0 0;
  font-size: 0.95em;
}
.remote-demo-table th {
  text-align: left;
  padding-right: 1rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.remote-demo-list {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
}
.remote-demo-list li {
  margin: 0.25rem 0;
}
</style>

## How it works

1. Your plugin registers an iframe dock with `remote: true` pointing at this page.
2. The DevTools core allocates a session-only auth token and appends the connection descriptor to the iframe URL: `#vite-devtools-kit-connection=…`
3. When this page loads, [`parseRemoteConnection()`](./remote-client#connect-from-the-hosted-page) reads the descriptor, and [`connectRemoteDevTools()`](./remote-client#connect-from-the-hosted-page) opens a WebSocket back to the local dev server.
4. The live "dock registry" list above subscribes to the `devtoolskit:internal:docks` shared state — it re-renders on every registration change.

See the [Remote Client guide](./remote-client) for the full API and the underlying security model.
