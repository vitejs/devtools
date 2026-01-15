---
outline: deep
---

# DevTools Kit

> [!WARNING] Experimental
> The API is still in development and may change in any version. If you are building on top of it, please mind the version of packages you are using and warn your users about the experimental status.

Vite DevTools Kit is a shared infrastructure for building custom developer tools that integrate seamlessly with Vite and frameworks built on top of it.

## What DevTools Kit Provides

DevTools Kit offers a complete toolkit for building DevTools integrations:

- **⚡ [Extensible Architecture](./devtools-plugin)**: Simple, well-typed APIs for registering custom visualizations, actions, and interactions. A DevTools plugin is a **superset** of a Vite plugin—just add a `devtools` hook to any existing Vite plugin.

- **📦 [Dock System](./dock-system)**: A unified entry point (similar to macOS Dock) where users can discover and switch between all DevTools integrations. Your plugin automatically appears alongside other tools in a consistent, familiar interface

- **🔌 [Built-in RPC Layer](./rpc)**: Type-safe bidirectional communication between your Node.js server and browser clients, eliminating the need to set up WebSocket connections or message passing manually

- **🔗 [Shared State](./shared-state)**: Share data between server and client with automatic synchronization

- **🌐 Isomorphic Views Hosting**: Write your UI once and deploy it anywhere—as embedded floating panels, browser extension panels, standalone webpages, or even deployable SPAs for sharing build snapshots (work in progress).

## Why DevTools Kit?

Traditionally, each framework or tool has had to build its own isolated DevTools from scratch—resulting in duplicated effort, inconsistent user experiences, and maintenance overhead. DevTools Kit changes this by providing a **unified, extensible foundation** that allows plugin and framework authors to focus on what makes their tools unique, rather than rebuilding common infrastructure.

Whether you're building a framework-specific inspector, a build analysis tool, or a custom debugging interface, DevTools Kit handles the heavy lifting of communication, UI hosting, and integration, so you can focus on delivering value to your users.

## Getting Started

If you're building a Vite plugin and want to add DevTools capabilities, or if you're creating a framework-specific DevTools integration, DevTools Kit makes it straightforward. The following sections will guide you through the core concepts and APIs:

- **[DevTools Plugin](./devtools-plugin)**: Learn how to create a DevTools plugin and register dock entries
- **[Dock System](./dock-system)**: Create UI panels, action buttons, or custom renderers
- **[Remote Procedure Calls (RPC)](./rpc)**: Enable bidirectional communication between server and client
- **[Shared State](./shared-state)**: Share data between server and client with automatic synchronization

> [!TIP] Help Us Improve
> If you are building something on top of Vite DevTools, we are inviting you to label your repository with `vite-devtools` on GitHub to help us track the usage and improve the project. Thank you!

## References

The docs might not cover all the details, please help us to improve it by submitting PRs. And in the meantime, you can refer to the following existing DevTools integrations for reference (but note they might not always be up to date with the latest API changes):

- [UnoCSS Inspector](https://github.com/unocss/unocss/blob/25c0dd737132dc20b257c276ee2bc3ccc05e2974/packages-integrations/inspector/src/index.ts#L140-L150) (a simple iframe-based dock entry)
- `vite-plugin-vue-tracer` (a simple action button to trigger the DOM inspector)
  - [plugin hook](https://github.com/antfu/vite-plugin-vue-tracer/blob/9f86fe723543405eea5d30588fe783796193bfd8/src/plugin.ts#L139-L157)
  - [client script](https://github.com/antfu/vite-plugin-vue-tracer/blob/main/src/client/vite-devtools.ts)
