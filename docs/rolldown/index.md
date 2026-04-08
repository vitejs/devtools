---
outline: deep
---

# DevTools for Rolldown

DevTools for Rolldown (`@vitejs/devtools-rolldown`) is a built-in integration that provides comprehensive build analysis for Vite projects using Rolldown. It comes included with Vite DevTools out of the box.

> [!WARNING]
> DevTools for Rolldown currently only supports build mode of Vite 8+.
> Dev mode and Vite versions under 8 are not supported yet.

## What It Does

DevTools for Rolldown gives you deep insights into your Rolldown-powered build process:

- **Module Analysis** — Visualize module graphs, dependencies, and transformation flows
- **Plugin Insights** — Inspect plugin hook costs and processed modules
- **Chunk & Asset Analysis** — Explore build output with list, graph, treemap, and flamegraph views
- **Package Detection** — Detect duplicated packages and analyze dependency sizes
- **Session Compare** — Compare bundle changes across builds

See the [Features](/rolldown/features) page for a detailed walkthrough with screenshots.

## Getting Started

DevTools for Rolldown is automatically available when you set up Vite DevTools. Follow the [Getting Started](/guide/) guide to install and configure Vite DevTools, then the Rolldown build analysis panels will appear in the dock.
