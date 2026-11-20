---
outline: deep
---

# VTKDT0005: Invalid Task Name

## Message

> Invalid task name "`{task}`".

## Cause

The requested task is empty, starts with a dash, or is absent from the task graph.

## Example

Requesting a run plan for a task that has been removed from the workspace configuration.

## Fix

Refresh the task graph and select a non-empty task name that does not start with a dash.

## Source

- [`packages/vite-task/src/node/tasks.ts`](https://github.com/vitejs/devtools/blob/main/packages/vite-task/src/node/tasks.ts) — `loadRunPlan()` throws this when the task name is invalid or missing from the graph.
