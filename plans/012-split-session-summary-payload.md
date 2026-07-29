# Plan 012: Split the Rolldown `get-session-summary` payload

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/rolldown/src/node/rpc/functions/rolldown-get-session-summary.ts packages/rolldown/src/shared/types/data.ts packages/rolldown/src/app/pages/session`
> Compare "Current state" against live code first.
>
> **This is investigate-then-implement.** The RPC response shape fans out to many
> client components. Step 1 is a mandatory consumer-mapping gate; do NOT change the
> payload before you have the full consumer list.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (but coordinate with 008/014 which touch the same package)
- **Category**: perf
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`vite:rolldown:get-session-summary` returns the **entire** module graph in one blob —
`Array.from(reader.manager.modules.values())` for every module, sorted — and the client
eagerly materializes all of it on mount into `SessionContext.modulesList`. For a large
build (tens of thousands of modules, each with imports/importers/build metrics) this is a
single unbounded payload that is serialized, shipped over the WS RPC, and held in client
memory before the session route paints. It gates first paint of every session view.

The goal: return light per-module metadata (id + the fields the summary view actually
needs) from the summary, and fetch heavy per-module detail (build metrics, transforms)
lazily via the existing per-module RPCs (`get-module-info`, `get-module-transforms`).

## Current state

- `packages/rolldown/src/node/rpc/functions/rolldown-get-session-summary.ts`:
  ```ts
  handler: async ({ session }: { session: string }) => {
    const reader = await manager.loadSessionSummary(session)
    return {
      id: session,
      meta: reader.meta,
      build_duration: reader.manager.build_end_time - reader.manager.build_start_time,
      modules: Array.from(reader.manager.modules.values())
        .sort((a, b) => a.id.localeCompare(b.id)),
    }
  }
  ```
- The `modules` result type feeds `ModuleListItem` in `packages/rolldown/src/shared/types/data.ts`
  (~lines 40-52) and `SessionContext.modulesList`.
- Known client consumers of `modulesList` (from the audit — **re-verify and extend in Step 1**):
  `packages/rolldown/src/app/pages/session/[session].vue` (~lines 85-97, materializes it),
  `components/data/PluginDetailsTable.vue`, `components/.../graph/index.vue`, `pages/.../chunks.vue`.
- Per-module detail RPCs already exist: `rolldown-get-module-info.ts`, `rolldown-get-module-transforms.ts`.

## Commands you will need

| Purpose         | Command                                                     | Expected     |
|-----------------|-------------------------------------------------------------|--------------|
| Map consumers   | `git grep -n "modulesList\|get-session-summary" -- 'packages/rolldown/**'` | list |
| Test (one)      | `pnpm -C packages/rolldown exec vitest run session-summary` | tests pass   |
| Build rolldown  | `pnpm -C packages/rolldown build`                           | exit 0       |
| Typecheck       | `pnpm typecheck`                                            | exit 0       |

## Scope

**In scope**:
- `packages/rolldown/src/node/rpc/functions/rolldown-get-session-summary.ts`
- `packages/rolldown/src/shared/types/data.ts` (`ModuleListItem` shape)
- The client consumers identified in Step 1 (pages/components that read `modulesList`)
- A node test for the new summary shape

**Out of scope**:
- `events-reader.ts` internals (do not change how modules are parsed).
- The per-module detail RPCs' existing behavior (you may *call* them from the client, not rewrite them).

## Git workflow

- Branch: `perf/rolldown-session-summary-split`.
- Conventional commits per logical unit (node shape, type, then each consumer).
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Map every consumer of `modules` / `modulesList` (GATE)

Run the grep above and open each hit. Produce a written list (in the PR description) of
exactly which fields of each module every consumer reads. This defines the "light"
`ModuleListItem` you can safely ship from the summary. If any consumer needs per-module
`build_metrics` synchronously at list time, note it — that consumer must move to a lazy
fetch, or the field stays. **Do not proceed to Step 2 until the field list is complete.**

### Step 2: Define the light summary type

In `data.ts`, split `ModuleListItem` into the light fields needed for the list/summary
(e.g. `id`, name/path, size, chunk association — whatever Step 1 shows is read eagerly)
vs. a heavy detail type fetched on demand. Keep names consistent with existing usage.

**Verify**: `pnpm typecheck` → exit 0 (expect errors to guide which consumers need edits).

### Step 3: Trim the node payload

Change the summary handler to map modules to the light shape only:
```ts
modules: Array.from(reader.manager.modules.values())
  .map(m => ({ id: m.id, /* only the light fields from Step 1 */ }))
  .sort((a, b) => a.id.localeCompare(b.id)),
```
Keep `id`, `meta`, `build_duration` as-is.

**Verify**: `pnpm typecheck` → resolve type errors by moving heavy-field reads in
consumers to lazy per-module fetches (Step 4).

### Step 4: Move heavy reads in consumers to lazy fetches

For each consumer that needed a heavy field, fetch it via `get-module-info` /
`get-module-transforms` when the user opens that module (not at list mount). Follow the
existing RPC-call pattern already used elsewhere in the app (grep for `rpc.` / the
composable used to call queries).

**Verify**: `pnpm -C packages/rolldown build` → exit 0. Manually (if a playground is
available) confirm the session list still renders and module detail still loads.

### Step 5: Node test for the trimmed shape

Add a test asserting the summary handler returns `modules` with only the light fields
(no `build_metrics`), given a stub reader. Reuse the fake-reader approach from plan 008 /
plan 014's fixtures if available.

**Verify**: `pnpm -C packages/rolldown exec vitest run session-summary` → pass.

## Test plan

- Node test: summary payload contains light module entries only (Step 5).
- Manual/e2e (if playground available): session route paints; opening a module still
  loads its details lazily.
- Verification: `pnpm -C packages/rolldown build` exits 0; new node test passes.

## Done criteria

ALL must hold:
- [ ] Step 1 consumer/field map recorded in the PR
- [ ] Summary payload no longer includes full per-module `build_metrics`/heavy fields
- [ ] Every consumer that needed a heavy field fetches it lazily; app builds
- [ ] `pnpm typecheck` exits 0; `pnpm -C packages/rolldown build` exits 0
- [ ] Node test asserts the trimmed shape
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- A consumer genuinely needs all modules' heavy metrics at list time (e.g. an aggregate
  chart) — then trimming breaks it; report the consumer and propose a dedicated aggregate
  RPC instead of shipping the whole graph.
- The `modules` field is consumed by an out-of-package client you can't see — grep the
  whole repo, not just `packages/rolldown`.
- Changing `ModuleListItem` cascades into `packages/vite` (shared types) — if so, treat the
  vite side as out of scope and STOP to rescope.

## Maintenance notes

- This is the kind of change that pairs with virtualization work; if the module list view
  isn't already virtualized, note it as a follow-up.
- Reviewer: scrutinize the Step 1 field map — a missed heavy-field consumer is how this
  regresses into runtime errors.
