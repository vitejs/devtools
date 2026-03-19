# JSON Render Patterns

Build DevTools UIs entirely from server-side TypeScript — no client code needed. Describe your UI as a JSON spec, and the DevTools client renders it with the built-in component library.

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

## Registration

Pass the renderer handle as `ui` when registering a `json-render` dock entry:

```ts
const ui = ctx.createJsonRenderer(spec)

ctx.docks.register({
  id: 'my-panel',
  title: 'My Panel',
  icon: 'ph:chart-bar-duotone',
  type: 'json-render',
  ui,
})
```

## Dynamic Updates

The `JsonRenderer` handle provides two methods for updating the UI reactively:

```ts
const ui = ctx.createJsonRenderer(buildSpec(initialData))

// Replace the entire spec (e.g. after fetching new data)
await ui.updateSpec(buildSpec(newData))

// Shallow-merge into spec.state (updates client-side state values)
await ui.updateState({ searchQuery: 'vue' })
```

Update the dock entry badge when data changes:

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

Buttons in the spec trigger RPC functions on the server via the `on` property:

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

// On the server — register the matching RPC function
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

Pass parameters from the spec to the action handler:

```ts
on: {
  press: {
    action: 'my-plugin:delete',
    params: { id: 'some-id' },
  },
}
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

| Component | Props | Description |
|-----------|-------|-------------|
| `Stack` | `direction`, `gap`, `align`, `justify`, `padding` | Flex layout container |
| `Card` | `title`, `collapsible` | Container with optional title, collapsible |
| `Divider` | `label` | Separator line with optional label |

### Typography

| Component | Props | Description |
|-----------|-------|-------------|
| `Text` | `content`, `variant` (`heading`/`body`/`caption`/`code`) | Display text |
| `Icon` | `name`, `size` | Iconify icon by name |
| `Badge` | `text`, `variant` (`info`/`success`/`warning`/`error`/`default`) | Status label |

### Inputs

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | `label`, `icon`, `variant` (`primary`/`secondary`/`ghost`/`danger`), `disabled` | Clickable button, fires `press` event |
| `TextInput` | `placeholder`, `value`, `label`, `disabled` | Text input, supports `$bindState` on `value` |

### Data Display

| Component | Props | Description |
|-----------|-------|-------------|
| `KeyValueTable` | `title`, `entries` (`Array<{ key, value }>`) | Two-column key-value table |
| `DataTable` | `columns`, `rows`, `maxHeight` | Tabular data with configurable columns |
| `CodeBlock` | `code`, `language`, `filename`, `maxHeight` | Code snippet with optional filename header |
| `Progress` | `value`, `max`, `label` | Progress bar with percentage |
| `Tree` | `data`, `expandLevel` | Expandable tree for nested objects |

## Full Example

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
        children: ['header', 'divider', 'stats'],
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
        type: 'KeyValueTable',
        props: {
          title: 'Summary',
          entries: [
            { key: 'Total Modules', value: String(data.modules) },
            { key: 'Build Time', value: data.time },
            { key: 'Output Size', value: data.size },
          ],
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

> See the [Git UI example](https://github.com/vitejs/devtools/tree/main/examples/plugin-git-ui) for a more advanced plugin using json-render with per-file actions, text input with state binding, and dynamic badge updates.
