---
outline: deep
---

# VTKDT0004: Invalid Vite Plus JSON

## Message

> Vite Plus returned invalid JSON for "`{command}`".

## Cause

The inspector could not parse the command's standard output as JSON.

## Example

Loading the task graph while workspace configuration prints additional text to standard output.

## Fix

Check the Vite Plus version and ensure the workspace configuration does not print to standard output.

## Source

- [`packages/vite-task/src/node/tasks.ts`](https://github.com/vitejs/devtools/blob/main/packages/vite-task/src/node/tasks.ts) — `runJson()` throws this when JSON parsing fails.
