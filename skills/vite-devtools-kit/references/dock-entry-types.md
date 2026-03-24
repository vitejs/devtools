# Dock Entry Types

Detailed configuration for each dock entry type.

## Common Properties

All dock entries share these properties:

```ts
interface DockEntryBase {
  id: string // Unique identifier
  title: string // Display title
  icon: string // URL, data URI, or Iconify name
  category?: string // Grouping category
  defaultOrder?: number // Sort order (higher = earlier)
  when?: string // Conditional visibility expression — see [When Clauses](./when-clauses.md)
  badge?: string // Badge text on dock icon (e.g., count)
}
```

## Icons

<!-- eslint-skip -->

```ts
// Iconify (recommended)
icon: 'ph:chart-bar-duotone'  // Phosphor Icons
icon: 'carbon:analytics'       // Carbon Icons
icon: 'mdi:view-dashboard'     // Material Design

// URL
icon: 'https://example.com/logo.svg'

// Data URI
icon: 'data:image/svg+xml,<svg>...</svg>'

// Light/dark variants
icon: {
  light: 'https://example.com/logo-light.svg',
  dark: 'https://example.com/logo-dark.svg',
}
```

Browse icons at [Iconify](https://icon-sets.iconify.design/).

## Iframe Entries

Most common type. Displays your UI in an isolated iframe.

```ts
interface IframeEntry extends DockEntryBase {
  type: 'iframe'
  url: string // URL to load
  frameId?: string // Share iframe between entries
  clientScript?: ClientScriptEntry // Optional client script
}

// Example
ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:house-duotone',
  type: 'iframe',
  url: '/.my-plugin/',
})
```

### Hosting Your Own UI

```ts
import { fileURLToPath } from 'node:url'

const clientDist = fileURLToPath(
  new URL('../dist/client', import.meta.url)
)

ctx.views.hostStatic('/.my-plugin/', clientDist)

ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:house-duotone',
  type: 'iframe',
  url: '/.my-plugin/',
})
```

## Action Entries

Buttons that trigger client-side scripts. Perfect for inspectors and toggles.

```ts
interface ActionEntry extends DockEntryBase {
  type: 'action'
  action: {
    importFrom: string // Package export path
    importName?: string // Export name (default: 'default')
  }
}

// Registration
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

### Client Script Implementation

```ts
// src/devtools-action.ts
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DevToolsClientScriptContext) {
  let overlay: HTMLElement | null = null

  ctx.current.events.on('entry:activated', () => {
    overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      cursor: crosshair;
      z-index: 99999;
    `
    overlay.onclick = (e) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)
      console.log('Selected:', target)
    }
    document.body.appendChild(overlay)
  })

  ctx.current.events.on('entry:deactivated', () => {
    overlay?.remove()
    overlay = null
  })
}
```

### Package Export

```json
{
  "exports": {
    ".": "./dist/index.mjs",
    "./devtools-action": "./dist/devtools-action.mjs"
  }
}
```

## Custom Render Entries

Render directly into the DevTools panel DOM. Use when you need direct DOM access or framework mounting.

```ts
interface CustomRenderEntry extends DockEntryBase {
  type: 'custom-render'
  renderer: {
    importFrom: string
    importName?: string
  }
}

ctx.docks.register({
  id: 'my-custom',
  title: 'Custom View',
  icon: 'ph:code-duotone',
  type: 'custom-render',
  renderer: {
    importFrom: 'my-plugin/devtools-renderer',
    importName: 'default',
  },
})
```

### Renderer Implementation

```ts
// src/devtools-renderer.ts
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DevToolsClientScriptContext) {
  ctx.current.events.on('dom:panel:mounted', (panel) => {
    // Vanilla JS
    panel.innerHTML = `<div style="padding: 16px;">Hello</div>`

    // Or mount Vue
    // import { createApp } from 'vue'
    // import App from './App.vue'
    // createApp(App).mount(panel)

    // Or mount React
    // import { createRoot } from 'react-dom/client'
    // createRoot(panel).render(<App />)
  })
}
```

## JSON Render Entries

Server-side JSON specs rendered by the built-in component library. No client code needed.

```ts
interface JsonRenderEntry extends DockEntryBase {
  type: 'json-render'
  ui: JsonRenderer // Handle from ctx.createJsonRenderer()
}

// Registration
const ui = ctx.createJsonRenderer({
  root: 'root',
  state: { query: '' },
  elements: {
    root: {
      type: 'Stack',
      props: { direction: 'vertical', gap: 12 },
      children: ['heading', 'info'],
    },
    heading: {
      type: 'Text',
      props: { content: 'My Panel', variant: 'heading' },
    },
    info: {
      type: 'KeyValueTable',
      props: {
        entries: [
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

### Dynamic Updates

```ts
// Replace the entire spec
await ui.updateSpec(buildSpec(newData))

// Shallow-merge into spec.state
await ui.updateState({ query: 'vue' })
```

### Action Handling

Buttons trigger server-side RPC functions via `on.press.action`:

```ts
// In spec element
{
  type: 'Button',
  props: { label: 'Refresh', icon: 'ph:arrows-clockwise' },
  on: { press: { action: 'my-plugin:refresh' } },
}

// Matching RPC function
ctx.rpc.register(defineRpcFunction({
  name: 'my-plugin:refresh',
  type: 'action',
  setup: ctx => ({
    handler: async () => {
      await ui.updateSpec(buildSpec(await fetchData()))
    },
  }),
}))
```

### JSON Render Use Cases

- **Build reports** — Display build stats, module lists, timing data
- **Configuration viewers** — Show resolved config with key-value tables
- **Status dashboards** — Progress bars, badges, real-time updates
- **Simple forms** — Text inputs with state binding + action buttons

See [JSON Render Patterns](./json-render-patterns.md) for the full component library and state binding details.

## Launcher Entries

Actionable setup cards for running initialization tasks. Shows a card with title, description, and a launch button.

```ts
type LauncherStatus = 'idle' | 'loading' | 'success' | 'error'

interface LauncherEntry extends DockEntryBase {
  type: 'launcher'
  launcher: {
    title: string // Card title
    description?: string // Card description
    icon?: string | { light: string, dark: string } // Card icon
    buttonStart?: string // Start button text
    buttonLoading?: string // Loading button text
    status?: LauncherStatus // Current status
    error?: string // Error message when status is 'error'
    onLaunch: () => Promise<void> // Callback when user clicks launch
  }
}

// Registration
const entry = ctx.docks.register({
  id: 'my-setup',
  title: 'My Setup',
  icon: 'ph:rocket-launch-duotone',
  type: 'launcher',
  launcher: {
    title: 'Initialize My Plugin',
    description: 'Run the initial setup before the plugin can be used',
    buttonStart: 'Start Setup',
    buttonLoading: 'Setting up...',
    onLaunch: async () => {
      // Perform initialization
      await runSetup()
    },
  },
})

// Update status after launch completes
entry.update({
  launcher: {
    ...entry.launcher,
    status: 'success',
  },
})
```

### Launcher Use Cases

- **First-run setup** — Run initial scans or configuration before showing results
- **Build triggers** — Start a build or analysis pass on demand
- **Authentication** — Prompt user to connect external services

## Client Script Events

| Event | Payload | Description |
|-------|---------|-------------|
| `entry:activated` | - | Entry was selected |
| `entry:deactivated` | - | Entry was deselected |
| `entry:updated` | `DevToolsDockUserEntry` | Entry metadata changed |
| `dom:panel:mounted` | `HTMLDivElement` | Panel DOM ready (custom-render only) |
| `dom:iframe:mounted` | `HTMLIFrameElement` | Iframe mounted (iframe only) |

## Category Order

Default category ordering:

```ts
DEFAULT_CATEGORIES_ORDER = {
  '~viteplus': -1000, // First
  'default': 0,
  'app': 100,
  'framework': 200,
  'web': 300,
  'advanced': 400,
  '~builtin': 1000, // Last
}
```

Use `category` to group related entries:

```ts
ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:house-duotone',
  type: 'iframe',
  url: '/.my-plugin/',
  category: 'framework',
})
```
