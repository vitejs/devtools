---
outline: deep
---

# Examples

A collection of example plugins built with `@vitejs/devtools-kit` that demonstrate different features and patterns.

## A11y Checker

An accessibility auditing plugin powered by [axe-core](https://github.com/dequelabs/axe-core).

**Features demonstrated:**

- Registering an `action` dock entry with a client-side script
- Running axe-core accessibility audits on the current page
- Reporting violations as DevTools logs with severity levels
- Using log handles to update a summary log in-place

**Source:** [`examples/plugin-a11y-checker`](https://github.com/vitejs/devtools/tree/main/examples/plugin-a11y-checker)

## File Explorer

A file explorer dock that lists, reads, and writes files through RPC.

**Features demonstrated:**

- Creating and registering RPC functions (`static`, `query`, `action`)
- Hosting a custom UI panel with `context.views.hostStatic(...)`
- Registering an `iframe` dock entry
- RPC dump support for static builds
- Detecting backend mode (`websocket` vs `static`) on the client

**Source:** [`examples/plugin-file-explorer`](https://github.com/vitejs/devtools/tree/main/examples/plugin-file-explorer)

## Git UI

An interactive Git panel built entirely with server-side JSON specs — no client code at all.

**Features demonstrated:**

- Using the `json-render` dock type for zero-client-code panels
- Building a `JsonRenderSpec` from server-side data (git branch, status, log)
- Dynamic spec updates via shared state (`sharedStateKey`)
- Button actions bridged to RPC functions (`git-ui:refresh`, `git-ui:commit`)
- Text input with `$bindState` two-way binding and `$state` in action params
- Updating dock badge text reactively

**Source:** [`examples/plugin-git-ui`](https://github.com/vitejs/devtools/tree/main/examples/plugin-git-ui)
