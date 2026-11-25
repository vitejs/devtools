---
outline: deep
---

# VTKDT0001: Vite Plus Executable Not Found

## Message

> Local Vite Plus executable not found at "`{executable}`".

## Cause

The task inspector could not find the workspace's local Vite Plus executable in `node_modules/.bin`.

## Example

Opening the task inspector in a workspace where `vite-plus` has not been installed.

## Fix

Install `vite-plus` 1.6.0 or newer in the workspace root.

## Source

- [`packages/vite-task/src/node/tasks.ts`](https://github.com/vitejs/devtools/blob/main/packages/vite-task/src/node/tasks.ts) — `runJson()` throws this when the local executable is missing.
