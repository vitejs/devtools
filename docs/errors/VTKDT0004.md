---
outline: deep
---

# VTKDT0004: Invalid Vite Plus JSON

## Message

> Vite Plus returned invalid or unsupported JSON for "`{command}`".

## Cause

The inspector expects a version 1 JSON object with string `$schema` and `workspaceRoot` fields. Task graphs must also contain `tasks` and `packages` objects, and dry-run responses must contain a `plan` object.

## Example

Loading the task graph while workspace configuration prints additional text to standard output.

## Fix

Check the Vite Plus version and ensure the workspace configuration does not print to standard output.

## Source

- [`packages/vite-task/src/node/tasks.ts`](https://github.com/vitejs/devtools/blob/main/packages/vite-task/src/node/tasks.ts) — `runJson()` throws this when parsing fails or the top-level fields do not match the expected format.
