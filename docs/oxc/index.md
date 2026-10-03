---
outline: deep
---

# DevTools for Oxc

DevTools for Oxc (`@vitejs/devtools-oxc`) inspects Oxlint and Oxfmt from the [Oxc](https://oxc.rs/) toolchain. It was donated from [`yuyinws/oxc-inspector`](https://github.com/yuyinws/oxc-inspector) by Leo.

## What it does

Tools for working with the Oxc toolchain:

- **Toolchain setup** — install Oxlint and Oxfmt, or migrate existing ESLint, Prettier, and Biome configurations.
- **Lint inspection** — run Oxlint and inspect diagnostics.
- **Configuration analysis** — explore Oxlint rules, plugins, and overrides.
- **Format inspection** — run Oxfmt and inspect formatting results.

## Getting started

Follow [Getting Started](/guide/) to set up Vite DevTools, then open the **Oxc** launcher and install the integration. Restart the development server to activate it.

It can also run as a standalone CLI:

```sh
npx @vitejs/devtools-oxc
```

## Overview

View installed versions and configuration files. Set up Oxlint and Oxfmt from the launcher.

![Oxc DevTools overview](/features/oxc/overview.png)

### Vite Plus

When [Vite Plus](https://viteplus.dev/) is detected, DevTools uses its bundled Oxc toolchain and runs Oxlint and Oxfmt commands through `vp`.

![Oxc DevTools overview](/features/oxc/vp-overview.png)

## Oxlint

### Lint Inspector

Run Oxlint and inspect current and previous results.

![Oxlint result history](/features/oxc/lint-list.png)

View run metadata and diagnostics grouped by file.

![Oxlint result details](/features/oxc/lint-detail.png)

### Config Inspector

Review the resolved configuration and rule summary.

![Oxlint configuration overview](/features/oxc/config-overview.png)

Search and filter rules by category, plugin, usage, and state.

![Oxlint rule table](/features/oxc/config-rules.png)

Inspect the plugins and rules applied by each file-pattern override.

![Oxlint configuration overrides](/features/oxc/config-overrides.png)

## Oxfmt

### Oxfmt Inspector

Run Oxfmt in check or write mode and inspect formatting results.

![Oxfmt inspector](/features/oxc/fmt-inspector.png)
