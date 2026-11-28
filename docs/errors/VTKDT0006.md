---
outline: deep
---

# VTKDT0006: Cannot Open Task Source

## Message

> Cannot open the task source. `{reason}`

## Cause

The selected task changed, the package files could not be read, the Vite configuration failed to load, or the host cannot open a local editor.

## Example

A developer selects a script, removes it from the package manifest, then clicks **Open script definition** in the task details.

## Fix

Check the package manifest and configuration, refresh the task list, and select the task again. Use a host with a local editor action.

## Source

- [`packages/vite-task/src/node/task-source.ts`](https://github.com/vitejs/devtools/blob/main/packages/vite-task/src/node/task-source.ts) — resolves the current script location or config file.
- [`packages/vite-task/src/node/rpc/index.ts`](https://github.com/vitejs/devtools/blob/main/packages/vite-task/src/node/rpc/index.ts) — checks the selected task and the host editor action.
