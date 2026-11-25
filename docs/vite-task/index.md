---
outline: deep
---

# DevTools for Vite Task

DevTools for Vite Task (`@vitejs/devtools-vite-task`) lets you explore your Vite+ task graph and track down cache misses.

## What it does

Select a task from the list or graph to see its run plan. DevTools builds the plan with `vp run --dry-run`.

- **Task Flow** — follow the planned order of tasks and expand a task to inspect its steps. When a cached run is available, its duration appears next to the task or step.
- **Commands** — inspect each command and its cache status. **Inputs** and **Outputs** list the paths recorded for the cached run. Look under **Changes** to see which files or settings have changed since then.
- **Dependencies** — see what the selected task depends on and which tasks depend on it. Follow a link to inspect a related task.

After editing an input, click **Refresh tasks** to see how the change affects the plan.

## Getting started

Use `vite-plus` v1.6.0 or later in your workspace root. To set up Vite DevTools, follow [Getting Started](/guide/).

In the DevTools dock, open **Vite Task** under **Vite+**. If you see **Install @vitejs/devtools-vite-task**, click it and restart your dev server once the installation finishes.
