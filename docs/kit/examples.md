---
outline: deep
---

# Examples

## Demo plugins

Reference plugins built with `@vitejs/devtools-kit`, each focused on a different feature set.

### A11y Checker

Accessibility auditing powered by [axe-core](https://github.com/dequelabs/axe-core).

**Features demonstrated:**

- An `action` dock entry with a client-side script.
- Running axe-core audits on the current page.
- Reporting violations as DevTools logs with severity levels.
- Using log handles to update a summary log in place.

**Source:** [`examples/plugin-a11y-checker`](https://github.com/vitejs/devtools/tree/main/examples/plugin-a11y-checker)

### File Explorer

A file-explorer dock that lists, reads, and writes files through RPC.

**Features demonstrated:**

- `static`, `query`, and `action` RPC functions.
- Custom UI panel hosted with `context.views.hostStatic(...)`.
- An `iframe` dock entry.
- RPC dump support for static builds.
- Backend-mode detection (`websocket` vs `static`) on the client.

**Source:** [`examples/plugin-file-explorer`](https://github.com/vitejs/devtools/tree/main/examples/plugin-file-explorer)

### Git UI

An interactive Git panel built from server-side JSON specs — no client code.

**Features demonstrated:**

- The `json-render` dock type for zero-client-code panels.
- Building a `JsonRenderSpec` from server-side data (branch, status, log).
- Dynamic spec updates via shared state (`sharedStateKey`).
- Button actions bridged to RPC functions (`git-ui:refresh`, `git-ui:commit`).
- Text input with `$bindState` two-way binding and `$state` in action params.
- Reactively updating the dock badge.

**Source:** [`examples/plugin-git-ui`](https://github.com/vitejs/devtools/tree/main/examples/plugin-git-ui)

## Real-world examples

Existing DevTools integrations worth reading:

- **[UnoCSS Inspector](https://github.com/unocss/unocss/blob/25c0dd737132dc20b257c276ee2bc3ccc05e2974/packages-integrations/inspector/src/index.ts#L140-L150)** — a small iframe dock entry.
- **[vite-plugin-vue-tracer](https://github.com/antfu/vite-plugin-vue-tracer)** — an action button that triggers a DOM inspector. See the [plugin hook](https://github.com/antfu/vite-plugin-vue-tracer/blob/9f86fe723543405eea5d30588fe783796193bfd8/src/plugin.ts#L139-L157) and the [client script](https://github.com/antfu/vite-plugin-vue-tracer/blob/main/src/client/vite-devtools.ts).
- **[Oxc Inspector](https://github.com/yuyinws/oxc-inspector/blob/main/src/vite.ts)** — an iframe dock entry with custom RPC functions.

PRs to improve coverage are welcome.
