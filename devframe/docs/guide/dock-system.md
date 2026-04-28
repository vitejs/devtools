---
outline: deep
---

# Dock System

Dock entries are the surfaces users interact with — the clickable icons in the DevTools dock and the panels that open when selected. A devtool typically registers one or more docks during `setup`.

## Entry Types

| Type | What it renders | Best for |
|------|-----------------|----------|
| `iframe` | An iframe pointing at a URL you provide. | Full-featured UIs, dashboards, framework apps. |
| `action` | Runs a client-side script when clicked. | Inspectors, toggles, one-shot actions. |
| `custom-render` | Mounts a client script into the panel DOM. | Framework apps that need direct DOM access. |
| `launcher` | A setup card with a server-triggered launch button. | Initialization flows before heavier tools. |
| `json-render` | UI described as a JSON spec — no client bundle needed. | Config viewers, data panels, simple forms. |

## Iframe Panels

The most common shape — point at a URL and let the iframe host your SPA.

### Bundled SPA

Host your built client through the view host so the same build serves every adapter:

```ts
import { fileURLToPath } from 'node:url'
import { defineDevtool } from 'devframe'

const clientDist = fileURLToPath(new URL('../client/dist', import.meta.url))

export default defineDevtool({
  id: 'my-devtool',
  name: 'My Devtool',
  setup(ctx) {
    ctx.views.hostStatic('/.my-devtool/', clientDist)

    ctx.docks.register({
      id: 'my-devtool:main',
      title: 'My Devtool',
      icon: 'ph:gauge-duotone',
      type: 'iframe',
      url: '/.my-devtool/',
    })
  },
})
```

`ctx.views.hostStatic(baseUrl, distDir)` does the right thing per mode:

- **Dev** — mounts middleware on the underlying runtime (h3 for the CLI adapter, Vite dev server for the Kit adapter).
- **Build** — copies `distDir` into the output so the static snapshot serves the same assets.

### External URL

If your UI is hosted elsewhere, point the iframe straight at it:

```ts
ctx.docks.register({
  id: 'my-devtool:hosted',
  title: 'My Devtool',
  icon: 'ph:cloud-duotone',
  type: 'iframe',
  url: 'https://example.com/my-devtool',
})
```

### Remote Docks

Set `remote: true` on an iframe dock to turn a hosted page into a live DevFrame client — DevFrame injects an auth-approved connection descriptor into the iframe URL so the hosted page can open a WebSocket back to the local dev server.

```ts
ctx.docks.register({
  id: 'my-devtool:hosted',
  title: 'My Devtool',
  icon: 'ph:cloud-duotone',
  type: 'iframe',
  url: 'https://example.com/my-devtool',
  remote: true,
})
```

On the hosted page, [`connectDevtool`](./client) parses the descriptor and returns a fully connected RPC client. See the [Client](./client) page for the connection model.

| Option | Default | Description |
|--------|---------|-------------|
| `remote.transport` | `'fragment'` | `'fragment'` keeps the descriptor out of access logs / `Referer`. `'query'` when your SPA router consumes the fragment. |
| `remote.originLock` | `true` | Reject WebSocket handshakes whose `Origin` doesn't match the registered dock URL. |

Remote docks only work in dev mode (no WebSocket server exists in a static build).

## Action Buttons

Action docks run a client script when clicked — no panel is opened. Perfect for inspector overlays, toggles, and one-shot actions.

```ts
ctx.docks.register({
  id: 'my-devtool:inspect',
  title: 'Inspect Element',
  icon: 'ph:cursor-duotone',
  type: 'action',
  action: {
    importFrom: 'my-devtool/action',
    importName: 'default',
  },
})
```

The client script runs in the user's page. It receives a context object with the RPC client and an event emitter for `entry:activated` / `entry:deactivated`.

## Custom Renderers

Custom render docks hand you the panel DOM element and let you render whatever you want:

```ts
ctx.docks.register({
  id: 'my-devtool:custom',
  title: 'Custom View',
  icon: 'ph:code-duotone',
  type: 'custom-render',
  renderer: {
    importFrom: 'my-devtool/renderer',
    importName: 'default',
  },
})
```

The renderer script listens for `dom:panel:mounted` and mounts a Vue / React / Svelte app — or just vanilla DOM — into the provided element.

## Launcher

Launcher docks show a setup card with a button that triggers a server-side callback:

```ts
ctx.docks.register({
  id: 'my-devtool:setup',
  title: 'My Setup',
  icon: 'ph:rocket-launch-duotone',
  type: 'launcher',
  launcher: {
    title: 'Initialize Integration',
    description: 'Run initial setup before opening tools',
    onLaunch: async () => {
      await runSetup()
    },
  },
})
```

Use launchers when a devtool has a heavy initialization step — generate artifacts, kick off a long terminal command, authenticate against an external service — before its main panels become useful.

## JSON Render

JSON render docks describe their UI as a JSON spec — the client interprets it directly, so you don't need to ship any dock-specific JavaScript:

```ts
defineDevtool({
  id: 'my-devtool',
  name: 'My Devtool',
  setup(ctx) {
    const ui = ctx.createJsonRenderer({
      root: 'root',
      elements: {
        root: {
          type: 'Stack',
          props: { direction: 'vertical', gap: 12 },
          children: ['heading', 'info'],
        },
        heading: { type: 'Text', props: { content: 'Hello', variant: 'heading' } },
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
      id: 'my-devtool:panel',
      title: 'Panel',
      icon: 'ph:chart-bar-duotone',
      type: 'json-render',
      ui,
    })
  },
})
```

Update the spec or state at runtime via `ui.updateSpec(newSpec)` / `ui.updateState({ key: value })`.

## Common Options

Every dock type accepts these base fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique, namespaced. |
| `title` | `string` | Label shown in the dock. |
| `icon` | `string \| { light, dark }` | Iconify name, URL, data URI, or light/dark pair. |
| `category` | `'app' \| 'framework' \| 'web' \| 'advanced' \| 'default'` | Grouping in the dock panel. |
| `defaultOrder` | `number` | Higher numbers appear first. Default `0`. |
| `when` | `string` | Visibility expression — see [When Clauses](./when-clauses). |
| `badge` | `string` | Short text badge (e.g. unread count). |

## Update & Unregister

`register()` returns a handle with `update(patch)`:

```ts
const handle = ctx.docks.register({ /* … */ })

// Live update
handle.update({ badge: '3' })
```

The handle only supports `update`. Docks are not individually unregisterable today.

## View Host

`ctx.views` is a thin helper used for hosting static assets. You'll typically only call `hostStatic`:

```ts
ctx.views.hostStatic('/.my-devtool/', clientDist)
```

Internal state (`buildStaticDirs`) is used by the build adapter — treat it as an implementation detail.
