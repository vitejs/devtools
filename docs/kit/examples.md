---
outline: deep
---

# Examples

## Demo plugins

Reference plugins built with `@vitejs/devtools-kit`, each focused on a different feature set.

### A11y Checker

Accessibility auditing powered by [axe-core](https://github.com/dequelabs/axe-core): an `action` dock entry with a client-side script that runs audits on the current page and reports violations as DevTools messages, updating a summary in place via a handle.

**Source:** [`examples/plugin-a11y-checker`](https://github.com/vitejs/devtools/tree/main/examples/plugin-a11y-checker)

### File Explorer

A file-explorer dock that lists, reads, and writes files through RPC — `static`, `query`, and `action` functions behind an `iframe` dock, with a custom UI hosted via `ctx.views.hostStatic()` and backend-mode detection on the client.

**Source:** [`examples/plugin-file-explorer`](https://github.com/vitejs/devtools/tree/main/examples/plugin-file-explorer)

### Git UI

An interactive Git panel built entirely from server-side [json-render](https://devfra.me/guide/json-render) specs — no client bundle. Shows dynamic spec updates via shared state, button actions bridged to RPC, and two-way text input binding.

**Source:** [`examples/plugin-git-ui`](https://github.com/vitejs/devtools/tree/main/examples/plugin-git-ui)

## Real-world integrations

- **[UnoCSS Inspector](https://github.com/unocss/unocss)** — a small iframe dock entry.
- **[vite-plugin-vue-tracer](https://github.com/antfu/vite-plugin-vue-tracer)** — an action button that triggers a DOM inspector.
- **[`@vitejs/devtools-oxc`](https://github.com/vitejs/devtools/blob/main/packages/oxc/src/vite.ts)** — the first-party Oxc inspector: an iframe dock with custom RPC functions.
