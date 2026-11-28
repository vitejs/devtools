---
outline: deep
---

# VTKDT0006: Cannot Open Task Source

## Message

> Cannot open the task source. `{reason}`

## Cause

The selected task changed, the package files could not be read, the package has no unique configuration file to open, or the host cannot open a local editor.

## Example

A developer selects a script, removes it from the package manifest, then clicks **Open script definition** in the task details.

## Fix

Check the package manifest and configuration, refresh the task list, and select the task again. Use a host with a local editor action.

## Source

- [`packages/vite-task/src/node/rpc/index.ts`](https://github.com/vitejs/devtools/blob/main/packages/vite-task/src/node/rpc/index.ts) — checks the selected task, its current file and the host editor action.
