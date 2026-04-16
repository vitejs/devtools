---
outline: deep
---

# Dock System

Dock entries are the primary way for users to interact with your DevTools integration. They appear as clickable items in the DevTools dock (similar to macOS Dock).

## Entry Types

DevTools Kit supports five types of dock entries:

| Type | Description | Use Case |
|------|-------------|----------|
| `iframe` | Displays your UI in an iframe panel | Full-featured UIs, dashboards, data visualization |
| `action` | Button that triggers client-side scripts | Inspectors, toggles, one-time actions |
| `custom-render` | Renders directly in the user's app DOM | When you need direct DOM access or framework integration |
| `launcher` | Actionable setup card shown in panel | Run one-time setup tasks before showing other tools |
| `json-render` | Renders UI from a JSON spec — no client code needed | Data panels, config viewers, simple interactive tools |

## Iframe Panels

The most common approach—host your UI in an iframe. This keeps your DevTools isolated from the user's app and lets you use any framework.

### Basic Example

```ts
ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'https://example.com/logo.svg',
  type: 'iframe',
  url: 'https://example.com/devtools',
})
```

### Hosting Your Own UI

For most use cases, you'll build and host your own UI. DevTools can serve your static files:

```ts
import { fileURLToPath } from 'node:url'

// Path to your built SPA
const clientDist = fileURLToPath(new URL('../dist/client', import.meta.url))

// Host the static files
ctx.views.hostStatic('/.my-plugin/', clientDist)

// Register the dock entry
ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:puzzle-piece-duotone',
  type: 'iframe',
  url: '/.my-plugin/',
})
```

DevTools handles:
- Serving files via dev server middleware
- Copying files to output during production builds

### Dock Entry Options

```ts
interface DockEntry {
  /** Unique identifier for this entry */
  id: string
  /** Display title shown in the dock */
  title: string
  /** Icon URL, data URI, or Iconify icon name (e.g., 'ph:house-duotone') */
  icon: string | { light: string, dark: string }
  /** Entry type */
  type: 'iframe' | 'action' | 'custom-render' | 'launcher' | 'json-render'
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

You can specify icons in several ways:

```ts
// URL to an image
icon: 'https://example.com/logo.svg'

// Data URI
icon: 'data:image/svg+xml,...'

// Iconify icon name (recommended)
icon: 'ph:chart-bar-duotone' // Phosphor Icons
icon: 'carbon:analytics' // Carbon Icons
icon: 'mdi:view-dashboard' // Material Design Icons

// Light/dark variants
icon: {
  light: 'https://example.com/logo-light.svg'
  dark: 'https://example.com/logo-dark.svg'
}
```

> [!TIP]
> Browse available icons at [Iconify](https://icon-sets.iconify.design/). The `ph:` (Phosphor) icon set works well for DevTools UIs.

> [!TIP]
> See the [File Explorer example](/kit/examples#file-explorer) for a iframe dock plugin with RPC and static build support.

## Action Buttons

Action buttons run client-side scripts when clicked. They're perfect for:
- Temporary inspector tools (DOM inspector, component picker)
- Feature toggles
- One-time actions that don't need a panel

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

### Client Script

Create the action script that runs in the user's browser:

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

### Package Export

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

### Available Events

| Event | Description |
|-------|-------------|
| `entry:activated` | Fired when the user clicks/activates this dock entry |
| `entry:deactivated` | Fired when another entry is selected or the dock is closed |

> [!TIP]
> See the [A11y Checker example](/kit/examples#a11y-checker) for a real-world action dock that runs axe-core audits and reports violations as logs.

## Custom Renderers

Custom renderers let you render directly into the DevTools panel DOM. This gives you full control and is useful when:
- You need direct DOM access
- You want to mount a framework app into the panel
- You need to avoid iframe isolation

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

### Renderer Script

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

### Available Events

| Event | Payload | Description |
|-------|---------|-------------|
| `dom:panel:mounted` | `HTMLElement` | Panel DOM is ready for rendering |
| `entry:activated` | — | Entry was activated |
| `entry:deactivated` | — | Entry was deactivated |

> [!NOTE]
> The panel DOM is preserved when users switch between dock entries. Your UI persists, so you only need to set up once in `dom:panel:mounted`.

## Launcher Entries

Launcher entries render a dedicated setup panel and trigger a server-side launch task. They are useful for integrations that need an explicit initialization step (for example starting a terminal task or generating artifacts).

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

> [!NOTE]
> Built-in logs panel (`~logs`) is currently reserved and hidden while log UI is under development.

## JSON Render Panels

JSON render panels let you describe your UI as a JSON spec on the server side — **no client code needed.** This is the simplest way to add a DevTools panel.

Use `ctx.createJsonRenderer()` to create a renderer handle, then pass it as `ui` when registering a `json-render` dock entry:

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

See the [JSON Render](/kit/json-render) page for the full component reference, dynamic updates, actions, state bindings, and examples.

## Communication with Server

All client scripts (actions and custom renderers) can communicate with the server using [RPC](./rpc):

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
