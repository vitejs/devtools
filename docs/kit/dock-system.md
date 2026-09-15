---
outline: deep
---

# Dock System

Dock entries are how users open your integration — clickable items in the DevTools dock, similar to the macOS Dock. You register them from `devtools.setup` via `ctx.docks`.

The dock is a hub concept shared across every host framework; its full entry-type reference, when-clauses, and remote-dock support live in the [Devframe hub docs](https://devfra.me/guide/hub). This page covers the parts a Vite integration reaches for most.

## Entry types

| Type | Description |
|------|-------------|
| `iframe` | Your UI in an isolated iframe panel — the default for full UIs |
| `action` | A button that runs a client-side script |
| `custom-render` | Renders directly in the user's app DOM |
| `launcher` | A setup card that runs a one-time task before showing a tool |
| `json-render` | UI from a serializable spec — no client bundle needed |
| `group` | Collapses related entries under one dock button |

## Iframe panels

The common case: host a built SPA with `ctx.views.hostStatic()` and point an iframe entry at the same route.

```ts
import { fileURLToPath } from 'node:url'

const clientDist = fileURLToPath(new URL('../dist/client', import.meta.url))
ctx.views.hostStatic('/__my-plugin/', clientDist)

ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:puzzle-piece-duotone',
  type: 'iframe',
  url: '/__my-plugin/',
})
```

Icons accept a URL, a data URI, or an [Iconify](https://icon-sets.iconify.design/) name (the `ph:` Phosphor set pairs well with DevTools UIs), or `{ light, dark }` for theme-aware icons.

## Groups

Set a shared `groupId` to collapse several entries under one dock button. Vite DevTools ships the `viteplus` group, which bundles the optional first-party integrations (Rolldown, Vite, Vitest, Oxc) behind a single button — pass `groupId: 'viteplus'` to place an entry there.

## Install launchers

Vite DevTools stays dependency-light: an optional integration that isn't installed yet appears as a `launcher` entry. Clicking it installs the package on demand (as a tracked terminal session), then prompts a dev-server restart so the real plugin can mount. `createInstallLauncher` builds that plugin for you.

```ts
import { createInstallLauncher } from '@vitejs/devtools-kit/node'

export default {
  plugins: [
    createInstallLauncher({
      id: 'my-integration',
      title: 'My Integration',
      icon: 'ph:sparkle-duotone',
      groupId: 'viteplus',
      install: ['@acme/vite-devtools-my-integration@^1.0.0'],
    }),
  ],
}
```

| Option | Description |
|--------|-------------|
| `id` | Dock entry id — usually the same id the real integration registers, so launcher and mounted dock share a rail slot |
| `title` | Dock title / rail tooltip |
| `icon` | A served URL or an Iconify `collection:name` |
| `install` | npm specs to ensure are installed; only missing ones are installed, in one call |
| `groupId` | Dock group, e.g. `'viteplus'` |
| `label` | Friendly name used in the launcher copy (defaults to `title`) |
| `pkg` | Package named in the button copy (defaults to the first `install` spec's bare name) |
| `dev` | Install as devDependencies (default `true`) |

The launcher installs at the workspace root — these are devtools for the whole workspace — and, on failure, surfaces [`DTK0050`](/errors/DTK0050) with the terminal output linked from the card.

## Talking to the server

Action scripts and iframe UIs communicate with the Node side over [RPC](https://devfra.me/guide/rpc), and share reactive data through [shared state](https://devfra.me/guide/shared-state). The `action`, `custom-render`, and `json-render` entry types, along with visibility `when` clauses, are documented in the [Devframe hub docs](https://devfra.me/guide/hub).
