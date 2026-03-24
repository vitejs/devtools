---
layout: home
theme: dark

hero:
  name: Vite DevTools
  text: A devtools framework for Vite ecosystem.
  tagline: An extensible foundation for building and composing developer tools across the Vite ecosystem
  actions:
    - theme: brand
      text: Get Started
      link: ./guide
    - theme: alt
      text: View on GitHub
      link: https://github.com/vitejs/devtools
  image:
    src: /hero.svg
    alt: Vite DevTools

features:
  - icon: 🔍
    title: DevTools for Rolldown
    details: Built-in integration for Rolldown build analysis. Visualize module graphs, dependencies, chunks, assets, and build metadata.
  - icon: 🧩
    title: Extensible Architecture
    details: Build custom DevTools integrations with the DevTools Kit. Any Vite plugin can extend the devtools with a simple hook to add visualizations, inspectors, and tools.
  - icon: 🚀
    title: Unified Dock System
    details: A familiar dock interface (like macOS Dock) where all DevTools integrations appear together. Switch between tools seamlessly in a consistent UI.
  - icon: 🔌
    title: Type-Safe RPC
    details: Built-in RPC layer for bidirectional communication between server and client. Full TypeScript support for type-safe data exchange.
  - icon: 🎨
    title: Flexible UI Options
    details: Choose from iframe panels, custom renderers, or action buttons. Host your UI as embedded panels, browser extensions, or standalone webpages.
  - icon: ⚡
    title: Framework Agnostic
    details: Works with any framework built on Vite. Use Vue, React, Svelte, or any other framework to build your DevTools UI.
---

<script setup>
import Home from './.vitepress/theme/Home.vue'
</script>

<Home />
