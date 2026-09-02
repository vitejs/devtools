# Plan 016: Break up the `RolldownEventsReader` god class

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/rolldown/src/node/rolldown/events-reader.ts`
> Compare "Current state" against live code first.
>
> **Prerequisite gate**: plan 014 (characterization tests for events-reader/log-cache)
> MUST be landed. If those tests do not exist, STOP — do not refactor this file without them.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/014 (characterization net)
- **Category**: tech-debt / architecture
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`packages/rolldown/src/node/rolldown/events-reader.ts` is **1365 lines** — ~29× the repo
median file (47) and well above p90 (219). One `RolldownEventsReader` class carries ~25
methods spanning line reading/indexing, string-ref resolution, module-metrics caching with
byte accounting, asset hydration, package-summary computation, and plugin-metrics
summarization, alongside ~16 free functions in the same file. It is the hottest node-side
path (parsing rolldown debug logs) and the natural home for perf bugs (it hosts the
concurrency issue characterized by the existing test and the payload issue in plan 012).
Its size makes it hard to test in isolation and high-risk to change. This plan extracts
cohesive collaborators behind narrow interfaces, leaving `RolldownEventsReader` a thin
orchestrator — **without changing observable behavior** (the plan 014 tests are the gate).

## Current state

- `events-reader.ts` (1365 lines): class `RolldownEventsReader` with a static filepath-keyed
  cache (`get`/`peek`/`dispose`), the public read API (`read`, `readSummary`, `readAssets`,
  `readPackageSummary`, `ensurePackageSummaryCache`, `hasCompleteSession`,
  `isReadingCompleteSession`), a `manager` (`RolldownEventsManager`), `meta`, and byte cursors
  (`lastBytes`, `lastTimestamp`). Plus ~16 module-level free functions (e.g. `getDeferredContent`,
  `cloneModuleBuildMetrics`, `estimateContentByteSizeFromLine`, `summarizePluginCalls`,
  `pruneReaders`).
- Consumers depend only on the **public API** above (via `logs-manager.ts` and the RPC functions).
  The internal caches/index maps are private.
- After plan 014, `__tests__/events-reader.test.ts` (extended) + `__tests__/log-cache.test.ts`
  pin the public behavior.

## Commands you will need

| Purpose    | Command                                                       | Expected    |
|------------|---------------------------------------------------------------|-------------|
| Tests      | `pnpm -C packages/rolldown exec vitest run`                   | all pass    |
| Build      | `pnpm -C packages/rolldown build`                             | exit 0      |
| Typecheck  | `pnpm typecheck`                                              | exit 0      |
| File size  | `wc -l packages/rolldown/src/node/rolldown/*.ts`              | reference   |

## Scope

**In scope**:
- `packages/rolldown/src/node/rolldown/events-reader.ts` (split)
- New sibling files under `packages/rolldown/src/node/rolldown/` for the extracted collaborators
- Their unit tests (new files)

**Out of scope**:
- The **public API** of `RolldownEventsReader` — signatures and behavior must not change
  (consumers in `logs-manager.ts` and `rpc/functions/*` stay untouched).
- `logs-manager.ts`, RPC functions, the client.
- Any perf optimization (this is a structural refactor; do perf work in a separate plan so the
  diff stays reviewable).

## Git workflow

- Branch: `refactor/rolldown-events-reader-split`.
- **Commit per extracted collaborator** (small, verifiable units) — after each extraction the
  full rolldown suite must still pass. Message style: `refactor(rolldown): extract <X> from events reader`.
- Do NOT push/PR unless instructed.

## Steps

### Step 0: Confirm the characterization net exists

Run `pnpm -C packages/rolldown exec vitest run events-reader log-cache`. If those tests are
absent or failing on the untouched tree, STOP (plan 014 is the prerequisite).

### Step 1: Identify seams

From the current file, group the members into cohesive collaborators. Candidate seams
(confirm against the actual code):
- **LogLineReader/indexer** — byte-offset walking, line splitting, skip-bad-line handling, the `RDDT0002` reporting.
- **StringRefResolver** — the string-ref table + resolution helpers.
- **ModuleMetricsCache** — the LRU/byte-accounted per-module metrics cache
  (`cloneModuleBuildMetrics`, `setCachedModuleBuildMetrics`, eviction).
- **PackageSummaryBuilder** — package-summary computation + `ensurePackageSummaryCache`.
- **PluginMetricsSummarizer** — `summarizePluginCalls` and friends.

Write the intended module list + each one's narrow interface into the PR description before editing.

### Step 2: Extract one collaborator at a time

For each seam: create a new file, move the logic behind a small interface, have
`RolldownEventsReader` hold/delegate to it. Keep the reader's public methods as thin
orchestration. After **each** extraction:

**Verify**: `pnpm -C packages/rolldown exec vitest run` → all pass; `pnpm typecheck` → exit 0.

Do not batch multiple extractions into one unverified step — the whole point is that the
characterization tests stay green at every commit.

### Step 3: Add focused unit tests for the extracted collaborators

Now that each collaborator is independently constructible, add small unit tests (e.g. the
line reader against a fixed buffer, the metrics cache eviction, the string-ref resolver). These
are the payoff of the refactor.

**Verify**: `pnpm -C packages/rolldown exec vitest run` → all pass.

### Step 4: Confirm the orchestrator shrank and behavior held

`wc -l` the resulting files: `events-reader.ts` should be materially smaller, with logic in
named collaborators. The plan 014 characterization tests must still pass unchanged.

**Verify**: `pnpm -C packages/rolldown build` → exit 0; full suite green.

## Test plan

- Plan 014's characterization tests are the regression gate (must pass unchanged at every commit).
- New per-collaborator unit tests from Step 3.
- Verification: `pnpm -C packages/rolldown exec vitest run` → all pass; `pnpm build` exits 0.

## Done criteria

ALL must hold:
- [ ] Plan 014 tests pass unchanged throughout (no edits to them to accommodate the refactor)
- [ ] At least the line-reader, metrics-cache, and one other collaborator extracted into their own files
- [ ] `RolldownEventsReader` public API (methods + behavior) unchanged; consumers untouched
- [ ] New unit tests for the extracted collaborators pass
- [ ] `pnpm typecheck`, `pnpm -C packages/rolldown build` exit 0
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- Plan 014's tests are absent or red on the untouched tree.
- An extraction can't preserve behavior without changing the public API — STOP and rescope
  (a public-API change needs its own plan + consumer updates).
- The characterization tests go red after an extraction and a reasonable fix doesn't restore
  them — revert that extraction and report the seam that resisted.

## Maintenance notes

- Keep the collaborators' interfaces narrow; the goal is testability and navigability, not
  maximal decomposition.
- This unblocks safer perf work (plan 012 and the concurrency hazards) inside a smaller surface.
- Reviewer: review commit-by-commit; each should be a behavior-preserving move with green tests.
