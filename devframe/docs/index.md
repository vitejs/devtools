---
layout: home

hero:
  name: DevFrame
  text: Framework-neutral foundation for DevTools
  tagline: One devtool definition. Seven adapters. RPC, hosts, shared state, agent-native — without depending on Vite or any framework.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/vitejs/devtools

features:
  - title: One Definition, Many Deployments
    details: A single `defineDevtool` call deploys to CLI, static build, SPA, Vite plugin, embedded overlay, kit host, or MCP server.
    link: /guide/devtool-definition
  - title: Type-safe RPC
    details: Bidirectional, schema-validated calls built on birpc + valibot. Query, static, action, and event function types.
    link: /guide/rpc
  - title: Headless by Default
    details: No banners, no logging, no opinionated styling. Hooks let your app own the UX while DevFrame owns the plumbing.
    link: /guide/
  - title: Agent-Native (experimental)
    details: Surface your devtool's RPC functions, tools, and resources to coding agents over MCP with a single field.
    link: /guide/agent-native
---
