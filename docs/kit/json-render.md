---
outline: deep
---

# JSON Render

JSON render panels build DevTools UIs from server-side TypeScript alone. You describe the UI as a JSON spec; the DevTools client renders it with the built-in component library.

## Getting started

Create a renderer handle with `ctx.createJsonRenderer()` and pass it as `ui` when registering a `json-render` dock entry:

```ts
import type { PluginWithDevTools } from '@vitejs/devtools-kit'

export function MyPlugin(): PluginWithDevTools {
  return {
    name: 'my-plugin',
    devtools: {
      setup(ctx) {
        const ui = ctx.createJsonRenderer({
          root: 'root',
          elements: {
            root: {
              type: 'Stack',
              props: { direction: 'column', gap: 12 },
              children: ['heading', 'info'],
            },
            heading: {
              type: 'Text',
              props: { text: 'Hello from JSON!', variant: 'heading' },
            },
            info: {
              type: 'KeyValueTable',
              props: {
                data: {
                  Version: '1.0.0',
                  Status: 'Running',
                },
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
      },
    },
  }
}
```

## Spec structure

A JSON render spec has three parts: a `root` element ID, an `elements` map, and an optional `state` object for two-way bindings.

```ts
ctx.createJsonRenderer({
  root: 'root',
  state: {
    searchQuery: '',
  },
  elements: {
    root: {
      type: 'Stack',
      props: { direction: 'column', gap: 12 },
      children: ['title', 'content'],
    },
    title: {
      type: 'Text',
      props: { text: 'My Panel', variant: 'heading' },
    },
    content: {
      type: 'Text',
      props: { text: 'Hello world' },
    },
  },
})
```

Every element has a `type` (component name), `props`, and optionally `children` (array of element IDs) or `on` (event handlers).

## Dynamic updates

The `JsonRenderer` handle returned by `ctx.createJsonRenderer()` exposes two methods for updating the UI reactively:

```ts
const ui = ctx.createJsonRenderer(buildSpec(initialData))

// Replace the entire spec (e.g. after fetching new data)
await ui.updateSpec(buildSpec(newData))

// Shallow-merge into spec.state (updates client-side state values)
await ui.updateState({ searchQuery: 'vue' })
```

You can also update the dock entry badge when data changes:

```ts
ctx.docks.update({
  id: 'my-panel',
  type: 'json-render',
  title: 'My Panel',
  icon: 'ph:chart-bar-duotone',
  ui,
  badge: hasWarnings ? '!' : undefined,
})
```

## Handling actions via RPC

Buttons in the spec can trigger RPC functions on the server. The `on` property carries an `action` key that matches a registered RPC function name:

```ts
// In the spec — Button with an action
const ui = ctx.createJsonRenderer({
  root: 'refresh-btn',
  elements: {
    'refresh-btn': {
      type: 'Button',
      props: { label: 'Refresh', icon: 'ph:arrows-clockwise' },
      on: { press: { action: 'my-plugin:refresh' } },
    },
  },
})
```

```ts
// On the server — register the matching RPC function:
ctx.rpc.register(defineRpcFunction({
  name: 'my-plugin:refresh',
  type: 'action',
  setup: ctx => ({
    handler: async () => {
      const data = await fetchData()
      await ui.updateSpec(buildSpec(data))
    },
  }),
}))
```

You can pass parameters from the spec to the action handler:

```ts
const ui = ctx.createJsonRenderer({
  root: 'delete-btn',
  elements: {
    'delete-btn': {
      type: 'Button',
      props: { label: 'Delete', variant: 'danger' },
      on: {
        press: {
          action: 'my-plugin:delete',
          params: { id: 'some-id' },
        },
      },
    },
  },
})
```

## State and two-way binding

`$bindState` on a TextInput `value` creates a two-way binding with a state key; `$state` reads the bound value in action params:

```ts
const ui = ctx.createJsonRenderer({
  root: 'root',
  state: { message: '' },
  elements: {
    root: {
      type: 'Stack',
      props: { direction: 'row', gap: 8 },
      children: ['input', 'submit'],
    },
    input: {
      type: 'TextInput',
      props: {
        placeholder: 'Type here...',
        value: { $bindState: '/message' },
      },
    },
    submit: {
      type: 'Button',
      props: { label: 'Submit', variant: 'primary' },
      on: {
        press: {
          action: 'my-plugin:submit',
          params: { text: { $state: '/message' } },
        },
      },
    },
  },
})
```

The server-side handler receives the resolved state values:

```ts
ctx.rpc.register(defineRpcFunction({
  name: 'my-plugin:submit',
  type: 'action',
  setup: ctx => ({
    handler: async (params: { text?: string }) => {
      console.log('User submitted:', params.text)
    },
  }),
}))
```

## Built-in components

An element whose `type` doesn't match any of the components below — e.g. a spec authored against a newer base-catalog version than the connected client implements, or a plain typo — renders as a visible "Unsupported component" placeholder instead of disappearing silently, so a mismatch is easy to spot during development.

### Layout

#### Stack

Flex layout container. Arranges children vertically or horizontally.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'row' \| 'column'` | `'column'` | Layout direction |
| `gap` | `number` | `8` | Gap between children in pixels |
| `align` | `'start' \| 'center' \| 'end' \| 'stretch'` | — | Cross-axis alignment |
| `justify` | `'start' \| 'center' \| 'end' \| 'between' \| 'around'` | — | Main-axis alignment |
| `wrap` | `boolean` | `false` | Allow children to wrap onto multiple lines |
| `flex` | `number \| string` | — | `flex` shorthand for the container |
| `padding` | `number` | — | Padding in pixels |

<!-- eslint-skip -->
```ts
// Horizontal toolbar with items spaced apart
{
  type: 'Stack',
  props: { direction: 'row', gap: 8, justify: 'between', align: 'center' },
  children: ['title', 'actions'],
}
```

<!-- eslint-skip -->
```ts
// Vertical form layout
{
  type: 'Stack',
  props: { direction: 'column', gap: 12, padding: 16 },
  children: ['name-input', 'email-input', 'submit-btn'],
}
```

#### Card

Container with an optional title and collapsible behavior.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Header title |
| `collapsible` | `boolean` | `false` | Whether the card can be collapsed |
| `defaultCollapsed` | `boolean` | `false` | Start collapsed (when `collapsible`) |
| `loading` | `boolean` | `false` | Show a loading state |

<!-- eslint-skip -->
```ts
{
  type: 'Card',
  props: { title: 'Build Info', collapsible: true },
  children: ['info-table'],
}
```

#### Divider

Visual separator line with an optional label.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Text shown in the middle of the divider |

<!-- eslint-skip -->
```ts
{
  type: 'Divider',
  props: { label: 'Advanced' },
}
```

### Typography

#### Text

Display text with different visual styles.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | — | Text content |
| `variant` | `'heading' \| 'subheading' \| 'body' \| 'caption' \| 'code'` | `'body'` | Visual style |
| `weight` | `'normal' \| 'medium' \| 'bold'` | — | Font weight |
| `color` | `'base' \| 'muted' \| 'faint' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | — | Text color |

<!-- eslint-skip -->
```ts
// heading — 16px bold
{ type: 'Text', props: { text: 'Module Graph', variant: 'heading' } }

// body (default) — 13px
{ type: 'Text', props: { text: 'Visualize module dependencies' } }

// caption — 12px, muted
{ type: 'Text', props: { text: 'Click a node to inspect', variant: 'caption' } }

// code — monospace with background
{ type: 'Text', props: { text: 'src/index.ts', variant: 'code' } }
```

#### Icon

Renders an [Iconify](https://icon-sets.iconify.design/) icon by name.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | — | Iconify icon name (e.g. `'ph:gear'`) |
| `size` | `number` | `20` | Icon size in pixels |

<!-- eslint-skip -->
```ts
{ type: 'Icon', props: { name: 'ph:check-circle', size: 16 } }
```

#### Badge

Status label with semantic color variants.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | — | Badge text |
| `variant` | `'default' \| 'info' \| 'success' \| 'warning' \| 'danger'` | `'default'` | Color variant |
| `minWidth` | `number` | — | Minimum width in pixels |

<!-- eslint-skip -->
```ts
{ type: 'Badge', props: { text: 'Ready', variant: 'success' } }
{ type: 'Badge', props: { text: '3 warnings', variant: 'warning' } }
{ type: 'Badge', props: { text: 'Failed', variant: 'danger' } }
```

### Inputs

#### Button

Clickable button that triggers an action via the `press` event.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Button text |
| `icon` | `string` | — | Iconify icon name |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'secondary'` | Visual style |
| `disabled` | `boolean` | `false` | Disable interaction |
| `loading` | `boolean` | `false` | Show a loading state |

**Event**: `press` — fires when the button is clicked.

<!-- eslint-skip -->
```ts
// Label + icon
{ type: 'Button', props: { label: 'Refresh', icon: 'ph:arrows-clockwise' }, on: { press: { action: 'my-plugin:refresh' } } }

// Danger variant
{ type: 'Button', props: { label: 'Clear Cache', variant: 'danger', icon: 'ph:trash' }, on: { press: { action: 'my-plugin:clear-cache' } } }

// Icon-only ghost button
{ type: 'Button', props: { icon: 'ph:plus', variant: 'ghost' }, on: { press: { action: 'my-plugin:add' } } }
```

#### TextInput

Text input field with optional two-way state binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `string` | — | Placeholder text |
| `value` | `string` | — | Current value (use `$bindState` for two-way binding) |
| `label` | `string` | — | Label shown above the input |
| `type` | `'text' \| 'search' \| 'number' \| 'password' \| 'email'` | `'text'` | Input type |
| `disabled` | `boolean` | `false` | Disable interaction |
| `loading` | `boolean` | `false` | Show a loading state |

<!-- eslint-skip -->
```ts
{
  type: 'TextInput',
  props: {
    placeholder: 'Search modules...',
    value: { $bindState: '/query' },
  },
}
```

See [State and Two-Way Binding](#state-and-two-way-binding) for a full example.

### Data display

#### KeyValueTable

Display key-value pairs in a two-column table.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Record<string, unknown>` | — | Key-value pairs to display |
| `loading` | `boolean` | `false` | Show a loading state |

<!-- eslint-skip -->
```ts
{
  type: 'KeyValueTable',
  props: {
    data: {
      Mode: 'production',
      Duration: '1.2s',
      Modules: '142',
      Output: 'dist/',
    },
  },
}
```

#### DataTable

Tabular data with configurable columns and scroll support.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `Array<string \| { key: string, label?: string }>` | — | Column definitions (a bare string uses the key as its label) |
| `rows` | `Array<Record<string, unknown>>` | — | Row data |
| `height` | `number` | — | Scrollable max height in pixels |
| `loading` | `boolean` | `false` | Show a loading state |

<!-- eslint-skip -->
```ts
{
  type: 'DataTable',
  props: {
    columns: [
      { key: 'id', label: 'Module' },
      { key: 'size', label: 'Size' },
      { key: 'time', label: 'Transform' },
    ],
    rows: [
      { id: 'src/index.ts', size: '2.1 KB', time: '12ms' },
      { id: 'src/utils.ts', size: '0.8 KB', time: '3ms' },
      { id: 'src/app.vue', size: '4.5 KB', time: '45ms' },
    ],
    height: 400,
  },
}
```

#### CodeBlock

Display a code snippet with an optional filename header.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | — | Code content |
| `language` | `string` | — | Language identifier |
| `filename` | `string` | — | Filename shown as header |
| `height` | `number` | — | Scrollable max height in pixels |

<!-- eslint-skip -->
```ts
{
  type: 'CodeBlock',
  props: {
    code: 'export default defineConfig({\n  plugins: [vue()],\n})',
    language: 'ts',
    filename: 'vite.config.ts',
    height: 200,
  },
}
```

#### Progress

Progress bar with a percentage label.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | — | Current value |
| `max` | `number` | `100` | Maximum value |
| `label` | `string` | — | Label text |

<!-- eslint-skip -->
```ts
{ type: 'Progress', props: { value: 73, max: 100, label: 'Build progress' } }
```

#### Tree

Expandable tree view for inspecting nested objects.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `unknown` | — | Any JSON-serializable value |
| `defaultExpanded` | `boolean` | `true` | Whether nodes start expanded |

<!-- eslint-skip -->
```ts
{
  type: 'Tree',
  props: {
    data: {
      build: {
        outDir: 'dist',
        minify: true,
        rollupOptions: { external: ['vue'] },
      },
      server: { port: 3000, hmr: true },
    },
    defaultExpanded: true,
  },
}
```

## Full example

A complete panel combining layout, data display, inputs, and actions:

```ts
import type { JsonRenderSpec, PluginWithDevTools } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

function buildSpec(data: { modules: number, time: string, size: string }): JsonRenderSpec {
  return {
    root: 'root',
    state: { filter: '' },
    elements: {
      'root': {
        type: 'Stack',
        props: { direction: 'column', gap: 12, padding: 8 },
        children: ['header', 'divider', 'stats', 'modules'],
      },
      'header': {
        type: 'Stack',
        props: { direction: 'row', gap: 8, align: 'center', justify: 'between' },
        children: ['title', 'refresh-btn'],
      },
      'title': {
        type: 'Text',
        props: { text: 'Build Report', variant: 'heading' },
      },
      'refresh-btn': {
        type: 'Button',
        props: { label: 'Refresh', icon: 'ph:arrows-clockwise' },
        on: { press: { action: 'build-report:refresh' } },
      },
      'divider': {
        type: 'Divider',
        props: {},
      },
      'stats': {
        type: 'Card',
        props: { title: 'Summary' },
        children: ['stats-table'],
      },
      'stats-table': {
        type: 'KeyValueTable',
        props: {
          data: {
            'Total Modules': String(data.modules),
            'Build Time': data.time,
            'Output Size': data.size,
          },
        },
      },
      'modules': {
        type: 'Card',
        props: { title: 'Modules', collapsible: true },
        children: ['module-table'],
      },
      'module-table': {
        type: 'DataTable',
        props: {
          columns: [
            { key: 'name', label: 'Module' },
            { key: 'size', label: 'Size' },
          ],
          rows: [
            { name: 'src/index.ts', size: '2.1 KB' },
            { name: 'src/app.vue', size: '4.5 KB' },
          ],
          height: 300,
        },
      },
    },
  }
}

export function BuildReportPlugin(): PluginWithDevTools {
  return {
    name: 'build-report',
    devtools: {
      setup(ctx) {
        const data = { modules: 142, time: '1.2s', size: '48 KB' }
        const ui = ctx.createJsonRenderer(buildSpec(data))

        ctx.docks.register({
          id: 'build-report',
          title: 'Build Report',
          icon: 'ph:chart-bar-duotone',
          type: 'json-render',
          ui,
        })

        ctx.rpc.register(defineRpcFunction({
          name: 'build-report:refresh',
          type: 'action',
          setup: ctx => ({
            handler: async () => {
              const newData = { modules: 145, time: '1.1s', size: '47 KB' }
              await ui.updateSpec(buildSpec(newData))
            },
          }),
        }))
      },
    },
  }
}
```

For a more advanced plugin using json-render with per-file actions, text input with state binding, and dynamic badge updates, see the [Git UI example](/kit/examples#git-ui).
