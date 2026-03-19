---
outline: deep
---

# JSON Render

JSON render panels let you build DevTools UIs entirely from server-side TypeScript — no client code needed. You describe your UI as a JSON spec, and the DevTools client renders it with the built-in component library.

## Getting Started

Use `ctx.createJsonRenderer()` to create a renderer handle from a spec, then pass it as `ui` when registering a `json-render` dock entry:

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
      },
    },
  }
}
```

## Spec Structure

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
      props: { direction: 'vertical', gap: 12 },
      children: ['title', 'content'],
    },
    title: {
      type: 'Text',
      props: { content: 'My Panel', variant: 'heading' },
    },
    content: {
      type: 'Text',
      props: { content: 'Hello world' },
    },
  },
})
```

Every element has a `type` (component name), `props`, and optionally `children` (array of element IDs) or `on` (event handlers).

## Dynamic Updates

The `JsonRenderer` handle returned by `ctx.createJsonRenderer()` provides two methods for updating the UI reactively:

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

## Handling Actions via RPC

Buttons in the spec can trigger RPC functions on the server. Use the `on` property with an `action` key that matches a registered RPC function name:

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

## State and Two-Way Binding

Use `$bindState` on TextInput `value` to create two-way binding with a state key. Use `$state` to read the bound value in action params:

```ts
const ui = ctx.createJsonRenderer({
  root: 'root',
  state: { message: '' },
  elements: {
    root: {
      type: 'Stack',
      props: { direction: 'horizontal', gap: 8 },
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

## Built-in Components

### Layout

#### Stack

Flex layout container. Arranges children vertically or horizontally.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'vertical' \| 'horizontal'` | `'vertical'` | Layout direction |
| `gap` | `number` | `8` | Gap between children in pixels |
| `align` | `'start' \| 'center' \| 'end' \| 'stretch'` | — | Cross-axis alignment |
| `justify` | `'start' \| 'center' \| 'end' \| 'space-between' \| 'space-around'` | — | Main-axis alignment |
| `padding` | `number` | — | Padding in pixels |

<!-- eslint-skip -->
```ts
// Horizontal toolbar with items spaced apart
{
  type: 'Stack',
  props: { direction: 'horizontal', gap: 8, justify: 'space-between', align: 'center' },
  children: ['title', 'actions'],
}
```

<!-- eslint-skip -->
```ts
// Vertical form layout
{
  type: 'Stack',
  props: { direction: 'vertical', gap: 12, padding: 16 },
  children: ['name-input', 'email-input', 'submit-btn'],
}
```

#### Card

Container with an optional title and collapsible behavior.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Header title |
| `collapsible` | `boolean` | `false` | Whether the card can be collapsed |

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
| `content` | `string` | — | Text content |
| `variant` | `'heading' \| 'body' \| 'caption' \| 'code'` | `'body'` | Visual style |

<!-- eslint-skip -->
```ts
// heading — 16px bold
{ type: 'Text', props: { content: 'Module Graph', variant: 'heading' } }

// body (default) — 13px
{ type: 'Text', props: { content: 'Visualize module dependencies' } }

// caption — 12px, muted
{ type: 'Text', props: { content: 'Click a node to inspect', variant: 'caption' } }

// code — monospace with background
{ type: 'Text', props: { content: 'src/index.ts', variant: 'code' } }
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
| `variant` | `'info' \| 'success' \| 'warning' \| 'error' \| 'default'` | `'default'` | Color variant |

<!-- eslint-skip -->
```ts
{ type: 'Badge', props: { text: 'Ready', variant: 'success' } }
{ type: 'Badge', props: { text: '3 warnings', variant: 'warning' } }
{ type: 'Badge', props: { text: 'Failed', variant: 'error' } }
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
| `disabled` | `boolean` | `false` | Disable interaction |

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

### Data Display

#### KeyValueTable

Display key-value pairs in a two-column table.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Optional header |
| `entries` | `Array<{ key: string, value: string }>` | — | Key-value pairs |

<!-- eslint-skip -->
```ts
{
  type: 'KeyValueTable',
  props: {
    title: 'Build Info',
    entries: [
      { key: 'Mode', value: 'production' },
      { key: 'Duration', value: '1.2s' },
      { key: 'Modules', value: '142' },
      { key: 'Output', value: 'dist/' },
    ],
  },
}
```

#### DataTable

Tabular data with configurable columns and scroll support.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `Array<{ key: string, label: string, width?: string }>` | — | Column definitions |
| `rows` | `Array<Record<string, unknown>>` | — | Row data |
| `maxHeight` | `string` | — | Scrollable max height (e.g. `'300px'`) |

<!-- eslint-skip -->
```ts
{
  type: 'DataTable',
  props: {
    columns: [
      { key: 'id', label: 'Module', width: '200px' },
      { key: 'size', label: 'Size', width: '80px' },
      { key: 'time', label: 'Transform', width: '100px' },
    ],
    rows: [
      { id: 'src/index.ts', size: '2.1 KB', time: '12ms' },
      { id: 'src/utils.ts', size: '0.8 KB', time: '3ms' },
      { id: 'src/app.vue', size: '4.5 KB', time: '45ms' },
    ],
    maxHeight: '400px',
  },
}
```

#### CodeBlock

Display a code snippet with an optional filename header.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | — | Code content |
| `language` | `string` | `'text'` | Language identifier |
| `filename` | `string` | — | Filename shown as header |
| `maxHeight` | `string` | — | Scrollable max height |

<!-- eslint-skip -->
```ts
{
  type: 'CodeBlock',
  props: {
    code: 'export default defineConfig({\n  plugins: [vue()],\n})',
    language: 'ts',
    filename: 'vite.config.ts',
    maxHeight: '200px',
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
| `expandLevel` | `number` | `1` | How many levels to auto-expand |

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
    expandLevel: 2,
  },
}
```

## Full Example

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
        props: { direction: 'vertical', gap: 12, padding: 8 },
        children: ['header', 'divider', 'stats', 'modules'],
      },
      'header': {
        type: 'Stack',
        props: { direction: 'horizontal', gap: 8, align: 'center', justify: 'space-between' },
        children: ['title', 'refresh-btn'],
      },
      'title': {
        type: 'Text',
        props: { content: 'Build Report', variant: 'heading' },
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
          entries: [
            { key: 'Total Modules', value: String(data.modules) },
            { key: 'Build Time', value: data.time },
            { key: 'Output Size', value: data.size },
          ],
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
            { key: 'size', label: 'Size', width: '80px' },
          ],
          rows: [
            { name: 'src/index.ts', size: '2.1 KB' },
            { name: 'src/app.vue', size: '4.5 KB' },
          ],
          maxHeight: '300px',
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

> [!TIP]
> See the [Git UI example](/kit/examples#git-ui) for a more advanced plugin using json-render with per-file actions, text input with state binding, and dynamic badge updates.
