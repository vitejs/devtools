---
outline: deep
---

# VTKDT0002: Unsupported Vite Plus Version

## Message

> Vite Plus `{version}` does not meet the required version >=1.6.0.

## Cause

The local Vite Plus version is older than the task inspector's required version, 1.6.0.

## Example

Opening the task inspector in a workspace using Vite Plus 1.5.0.

## Fix

Update the workspace's `vite-plus` dependency to 1.6.0 or newer.

## Source

- [`packages/vite-task/src/node/tasks.ts`](https://github.com/vitejs/devtools/blob/main/packages/vite-task/src/node/tasks.ts) — `runJson()` throws this when the local version is unsupported.
