---
layout: home

hero:
  name: Devframe
  text: Framework-neutral foundation for DevTools
  tagline: One devtool definition. Seven adapters. RPC, hosts, shared state, and agent-native — independent of Vite and any UI framework.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/vitejs/devtools

features:
  - icon: 🧱
    title: One Definition, Many Deployments
    details: A single `defineDevtool` call deploys to CLI, static build, SPA, Vite plugin, embedded overlay, kit host, or MCP server.
    link: /guide/devtool-definition
  - icon: 🔌
    title: Type-safe RPC
    details: Bidirectional, schema-validated calls built on birpc + valibot. Query, static, action, and event function types.
    link: /guide/rpc
  - icon: 🔄
    title: Shared State
    details: Observable, patch-synced state that survives reconnects and bridges server and browser with structured updates.
    link: /guide/shared-state
  - icon: 🌊
    title: Streaming Channels
    details: One-way RPC streams and two-way upload channels for long-running data, progress reporting, and live feeds.
    link: /guide/streaming
  - icon: 🎨
    title: Bring Your Own UX
    details: Hooks like `onReady` and `cli.configure` let your app own banners, logging, and styling while Devframe owns the plumbing.
    link: /guide/
  - icon: 🤖
    title: Agent-Native (experimental)
    details: Surface RPC functions, tools, and resources to coding agents over MCP with a single `agent` field on each function.
    link: /guide/agent-native
---
