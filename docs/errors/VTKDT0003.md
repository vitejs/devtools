---
outline: deep
---

# VTKDT0003: Vite Plus Command Failed

## Message

> Failed to run "`{command}`": `{reason}`

## Cause

A Vite Plus command failed, or the inspector could not recognize the output of `vp --version`.

## Example

Loading the task graph when a workspace task configuration causes `vp run --json` to fail.

## Fix

Check the local Vite Plus installation and workspace task configuration. Run the command shown in the diagnostic from the workspace root to inspect its output.

## Source

- [`packages/vite-task/src/node/tasks.ts`](https://github.com/vitejs/devtools/blob/main/packages/vite-task/src/node/tasks.ts) — `execute()` throws this on command failure; `runJson()` also throws it for unrecognized version output.
