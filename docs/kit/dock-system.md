---
outline: deep
---

# Dock System

Dock entries are how users open your DevTools integration — clickable items in the dock, similar to the macOS Dock.

## Entry types

Kit supports six dock entry types:

| Type | Description | Use Case |
|------|-------------|----------|
| `iframe` | Displays your UI in an iframe panel | Full-featured UIs, dashboards, data visualization |
| `action` | Button that triggers client-side scripts | Inspectors, toggles, one-time actions |
| `custom-render` | Renders directly in the user's app DOM | When you need direct DOM access or framework integration |
| `launcher` | Actionable setup card shown in panel | Run one-time setup tasks before showing other tools |
| `json-render` | Renders UI from a JSON spec — no client code needed | Data panels, config viewers, simple interactive tools |
| `group` | Collapses related entries under one dock button | Bundling a framework's tools under a single button |

## Iframe panels

The default choice — host your UI in an iframe. The frame stays isolated from the user's app and works with any framework.

### Basic example

```ts
ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'https://example.com/logo.svg',
  type: 'iframe',
  url: 'https://example.com/devtools',
})
```

### Hosting your own UI

For most use cases, you build and host your own UI. DevTools serves the static files:

```ts
import { fileURLToPath } from 'node:url'

// Path to your built SPA
const clientDist = fileURLToPath(new URL('../dist/client', import.meta.url))

// Host the static files
ctx.views.hostStatic('/__my-plugin/', clientDist)

// Register the dock entry
ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:puzzle-piece-duotone',
  type: 'iframe',
  url: '/__my-plugin/',
})
```

DevTools serves the files via dev-server middleware and copies them into the build output for production.

### Dock entry options

```ts
interface DockEntry {
  /** Unique identifier for this entry */
  id: string
  /** Display title shown in the dock */
  title: string
  /** Icon URL, data URI, or Iconify icon name (e.g., 'ph:house-duotone') */
  icon: string | { light: string, dark: string }
  /** Entry type */
  type: 'iframe' | 'action' | 'custom-render' | 'launcher' | 'json-render' | 'group'
  /** Id of the group this entry belongs to — see Docked groups */
  groupId?: string
  /** Member opened when a group button is activated (for type: 'group') */
  defaultChildId?: string
  /** URL to load in the iframe (for type: 'iframe') */
  url?: string
  /** Action configuration (for type: 'action') */
  action?: { importFrom: string, importName: string }
  /** Renderer configuration (for type: 'custom-render') */
  renderer?: { importFrom: string, importName: string }
  /** Launcher configuration (for type: 'launcher') */
  launcher?: {
    title: string
    onLaunch: () => Promise<void>
    description?: string
    buttonStart?: string
    buttonLoading?: string
  }
  /** JsonRenderer handle created by ctx.createJsonRenderer() (for type: 'json-render') */
  ui?: JsonRenderer
}
```

### Icons

Icons accept a URL, a data URI, or an [Iconify](https://icon-sets.iconify.design/) name. The `ph:` (Phosphor) set pairs well with DevTools UIs.

```ts
// URL to an image
icon: 'https://example.com/logo.svg'

// Data URI
icon: 'data:image/svg+xml,...'

// Iconify icon name
icon: 'ph:chart-bar-duotone' // Phosphor Icons
icon: 'carbon:analytics' // Carbon Icons
icon: 'mdi:view-dashboard' // Material Design Icons

// Light/dark variants
icon: {
  light: 'https://example.com/logo-light.svg'
  dark: 'https://example.com/logo-dark.svg'
}
```

The [File Explorer example](/kit/examples#file-explorer) is a complete iframe-dock plugin with RPC and static-build support.

### Remote-hosted UIs

To skip bundling a dist with your plugin, an iframe dock can point at a hosted website that connects back to the local dev server over WebSocket. See [Remote Client](./remote-client).

## Action buttons

Action buttons run a client-side script when clicked. They suit:

- Temporary inspector tools (DOM inspector, component picker).
- Feature toggles.
- One-shot actions where a button is enough.

### Registration

```ts
ctx.docks.register({
  id: 'my-inspector',
  title: 'Inspector',
  icon: 'ph:cursor-duotone',
  type: 'action',
  action: {
    importFrom: 'my-plugin/devtools-action',
    importName: 'default',
  },
})
```

### Client script

The action script runs in the user's browser:

```ts
// src/devtools-action.ts
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setupAction(ctx: DockClientScriptContext) {
  let isActive = false
  let overlay: HTMLElement | null = null

  ctx.current.events.on('entry:activated', () => {
    isActive = true
    console.log('Inspector activated')

    // Create an overlay
    overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      cursor: crosshair;
      z-index: 99999;
    `

    overlay.addEventListener('click', (e) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)
      console.log('Selected element:', target)
    })

    document.body.appendChild(overlay)
  })

  ctx.current.events.on('entry:deactivated', () => {
    isActive = false
    console.log('Inspector deactivated')

    // Cleanup
    overlay?.remove()
    overlay = null
  })
}
```

### Package export

Export the action script from your package:

```json
{
  "name": "my-plugin",
  "exports": {
    ".": "./dist/index.mjs",
    "./devtools-action": "./dist/devtools-action.mjs"
  }
}
```

### Available events

| Event | Description |
|-------|-------------|
| `entry:activated` | Fires when the user activates this dock entry |
| `entry:deactivated` | Fires when another entry is selected or the dock is closed |

For a real-world action dock, see the [A11y Checker example](/kit/examples#a11y-checker) — it runs axe-core audits and reports violations as logs.

## Custom renderers

Custom renderers paint directly into the DevTools panel DOM. Use them when you want direct DOM access, want to mount a framework app into the panel, or want to skip iframe isolation.

### Registration

```ts
ctx.docks.register({
  id: 'my-custom-view',
  title: 'Custom View',
  icon: 'ph:code-duotone',
  type: 'custom-render',
  renderer: {
    importFrom: 'my-plugin/devtools-renderer',
    importName: 'default',
  },
})
```

### Renderer script

```ts
// src/devtools-renderer.ts
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setupRenderer(ctx: DockClientScriptContext) {
  ctx.current.events.on('dom:panel:mounted', (panel) => {
    // `panel` is a DOM element you can render into

    // Option 1: Vanilla JS
    panel.innerHTML = `
      <div style="padding: 16px;">
        <h2>My Custom View</h2>
        <button id="my-btn">Click me</button>
      </div>
    `
    panel.querySelector('#my-btn')?.addEventListener('click', () => {
      console.log('Button clicked!')
    })

    // Option 2: Mount a Vue app
    // import { createApp } from 'vue'
    // import App from './App.vue'
    // createApp(App).mount(panel)

    // Option 3: Mount a React app
    // import { createRoot } from 'react-dom/client'
    // import App from './App'
    // createRoot(panel).render(<App />)
  })

  ctx.current.events.on('entry:deactivated', () => {
    // Optional cleanup
  })
}
```

### Available events

| Event | Payload | Description |
|-------|---------|-------------|
| `dom:panel:mounted` | `HTMLElement` | Panel DOM is ready for rendering |
| `entry:activated` | — | Entry was activated |
| `entry:deactivated` | — | Entry was deactivated |

The panel DOM is preserved across dock-entry switches, so your UI persists and the one-time setup belongs in `dom:panel:mounted`.

## Launcher entries

Launchers render a dedicated setup panel and run a server-side launch task. They suit integrations that need an explicit initialization step — starting a terminal task, generating artifacts, and so on.

```ts
ctx.docks.register({
  id: 'my-launcher',
  title: 'My Setup',
  icon: 'ph:rocket-launch-duotone',
  type: 'launcher',
  launcher: {
    title: 'Initialize Integration',
    description: 'Run initial setup before opening tools',
    onLaunch: async () => {
      // perform setup work here
    },
  },
})
```

## JSON render panels

JSON render panels describe a UI as a JSON spec on the server — the client renders it from a built-in component library. This is the shortest path to a DevTools panel: server-side TypeScript only.

Create a renderer handle with `ctx.createJsonRenderer()` and pass it as `ui` when registering a `json-render` dock entry:

```ts
const ui = ctx.createJsonRenderer({
  root: 'root',
  elements: {
    root: {
      type: 'Stack',
      props: { direction: 'vertical', gap: 12 },
      children: ['heading', 'info'],
    },
    heading: {
      type: 'Text',
      props: { content: 'Hello from JSON!', variant: 'heading' },
    },
    info: {
      type: 'KeyValueTable',
      props: {
        entries: [
          { key: 'Version', value: '1.0.0' },
          { key: 'Status', value: 'Running' },
        ],
      },
    },
  },
})

ctx.docks.register({
  id: 'my-panel',
  title: 'My Panel',
  icon: 'ph:chart-bar-duotone',
  type: 'json-render',
  ui,
})
```

See [JSON Render](/kit/json-render) for the full component reference, dynamic updates, actions, state bindings, and examples.

## Docked groups

Collapse several related entries under one dock button. A group shows as a single button on the dock bar; activating it reveals its members in a popover, and opening a member shows that view alongside a thin sidebar for switching between siblings. This lets a framework split its features into separate, individually-pluggable entries while presenting them as one unit.

Register a `group` entry, then point each member at it with `groupId`:

```ts
ctx.docks.register({
  id: 'nuxt',
  title: 'Nuxt',
  icon: 'logos:nuxt-icon',
  type: 'group',
  defaultChildId: 'nuxt:overview',
})

ctx.docks.register({
  id: 'nuxt:overview',
  title: 'Overview',
  icon: 'ph:gauge-duotone',
  type: 'iframe',
  url: '/__nuxt-overview/',
  groupId: 'nuxt',
})
```

A group carries the usual `title`/`icon`/`category`/`defaultOrder`/`when` fields and has no view of its own. `defaultChildId` names the member opened when the group button is activated; without it, the button reveals the member popover and opens a view once a member is chosen.

Membership is a flat pointer, not containment: every member stays an independently-registered top-level entry. A member whose `groupId` references a group that was never registered renders as a normal top-level entry, and a group with no members stays hidden until an entry joins it. Grouping is one level deep — a group entry does not set its own `groupId`.

### The built-in Vite+ group

Vite DevTools seeds a built-in **Vite+** group that collects Vite ecosystem integrations under one button. Join it with the exported id:

```ts
import { DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'

ctx.docks.register({
  id: 'rolldown',
  title: 'Rolldown',
  icon: 'https://example.com/rolldown.svg',
  type: 'iframe',
  url: '/__devtools-rolldown/',
  groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
})
```

DevTools for Rolldown joins this group out of the box.

### Visibility and order

From the dock settings panel, users hide or reorder members within a group independently, and hide the whole group from its row.

## Common options

Every dock type accepts these base fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique, namespaced. |
| `title` | `string` | Label shown in the dock. |
| `icon` | `string \| { light, dark }` | Iconify name, URL, data URI, or light/dark pair. |
| `category` | `'app' \| 'framework' \| 'web' \| 'advanced' \| 'default'` | Grouping in the dock panel. Defaults to `'default'`. |
| `defaultOrder` | `number` | Higher numbers appear first. Default `0`. |
| `when` | `string` | Visibility expression — see [When Clauses](/kit/when-clauses). |
| `badge` | `string` | Short text badge (e.g. unread count). |
| `groupId` | `string` | Collapse this entry under a group's button — see [Docked groups](#docked-groups). |

## Update

`register()` returns a handle with an `update(patch)` method:

```ts
const handle = ctx.docks.register({ /* ... */ })

// Live update (e.g. refresh the badge)
handle.update({ badge: '3' })
```

## Communication with the server

Action scripts and custom renderers talk to the server through [RPC](./rpc):

```ts
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DockClientScriptContext) {
  ctx.current.events.on('entry:activated', async () => {
    // Call a server function
    const data = await ctx.rpc.call('my-plugin:get-data')
    console.log('Data from server:', data)
  })
}
```

Or use `getDevToolsRpcClient()` in iframe pages:

```ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

const rpc = await getDevToolsRpcClient()
const data = await rpc.call('my-plugin:get-data')
```

See [RPC](./rpc) for complete documentation on server-client communication.
