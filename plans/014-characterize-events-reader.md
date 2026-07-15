# Plan 014: Characterization tests for `events-reader` + `log-cache`

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/rolldown/src/node/rolldown/`
> Compare "Current state" against live code first.

## Status

- **Priority**: P2
- **Effort**: M–L
- **Risk**: LOW (adds tests; no behavior change)
- **Depends on**: plans/001 (so `pnpm test` terminates)
- **Category**: tests
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

Rolldown build analysis is the feature Vite DevTools exists for today. Its core is
`packages/rolldown/src/node/rolldown/events-reader.ts` — **1365 lines** of byte-level
incremental `@rolldown/debug` log parsing, string-ref resolution, module-metrics caching
with byte accounting, and summary/package hydration — plus the 546-line `log-cache.ts`
(complex serialize/restore). The only existing test asserts one thing (concurrent `read()`
dedupe). A parser off-by-one (line offsets, `\r\n` handling, a line split across read
chunks) or a cache-eviction bug produces silently wrong build metrics. This plan builds a
fixture-driven characterization net so the parser and cache can be changed safely — and it
is a **prerequisite for plan 016** (breaking up the god class).

## Current state

- `packages/rolldown/src/node/rolldown/events-reader.ts` — `RolldownEventsReader` class with
  a static filepath-keyed cache (`RolldownEventsReader.get(filepath)`, `.peek`, `.dispose`),
  `read()` / `readSummary()` / `readAssets()` / `readPackageSummary()` /
  `ensurePackageSummaryCache()`, `manager` (a `RolldownEventsManager` with `modules`,
  `chunks`, `assets`, `eventCount`, `handleEvent`, `build_start_time`/`build_end_time`), and
  `meta`. Reads a JSON-lines-ish log file incrementally tracking byte offsets.
- `packages/rolldown/src/node/rolldown/log-cache.ts` — serialize/restore of parsed state to disk.
- Existing test `packages/rolldown/src/node/rolldown/__tests__/events-reader.test.ts` (40 lines):
  uses `RolldownEventsReader.get('/mock/logs.json')`, overrides `readChanges` via
  `Object.defineProperty`, feeds a `{ action: 'BuildStart', timestamp, session_id }` event
  through `reader.manager.handleEvent(event)`, asserts `reader.manager.eventCount`, and calls
  `reader.dispose()` in `finally`. This is your structural template.
- Event types come from `@rolldown/debug` (`import type { Event } from '@rolldown/debug'`).

## Commands you will need

| Purpose    | Command                                                       | Expected    |
|------------|---------------------------------------------------------------|-------------|
| Test (one) | `pnpm -C packages/rolldown exec vitest run events-reader log-cache` | pass  |
| Typecheck  | `pnpm typecheck`                                              | exit 0      |
| Lint       | `pnpm lint`                                                  | exit 0      |

## Scope

**In scope** (tests + fixtures only — NO source behavior changes):
- `packages/rolldown/src/node/rolldown/__tests__/events-reader.test.ts` (extend)
- `packages/rolldown/src/node/rolldown/__tests__/log-cache.test.ts` (create)
- `packages/rolldown/src/node/rolldown/__tests__/fixtures/` (create small `.json`/`.jsonl` log fixtures)

**Out of scope**:
- Any change to `events-reader.ts` / `log-cache.ts` source. If you find a bug while writing
  tests, **assert the current behavior** and note the suspected bug in the PR — do not fix it
  here (that risks turning a characterization test into a false green). Fixes belong in a
  separate plan (e.g. 016).

## Git workflow

- Branch: `test/rolldown-events-reader-characterization`.
- Conventional commits, e.g. `test(rolldown): characterize events reader and log cache`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Build small log fixtures from real event shapes

Create `__tests__/fixtures/` with 2–3 tiny log files representing a minimal build: a
`BuildStart`, a couple of module events, a chunk/asset event, and `BuildEnd` (use the exact
`action`/field names from `@rolldown/debug` `Event` — inspect the type or reuse the shape
from the existing test's `BuildStart` event). Keep them a handful of lines each. Prefer
generating them in-test via `handleEvent` where the file-reading path isn't what you're
characterizing, and use on-disk fixture files specifically for the byte-offset/line-parsing
tests.

**Verify**: fixtures load without throwing.

### Step 2: Characterize the parser

Extend `events-reader.test.ts`. Assert observable outputs after `read()` / `readSummary()`
on a fixture:
- Correct `manager.eventCount`, module count, `build_start_time`/`build_end_time`.
- **Incremental read**: reading, appending more lines to the file, reading again picks up
  only the new events (byte-offset accounting) and does not double-count.
- **Boundary cases**: a line terminated with `\r\n`; a trailing partial/blank line; (if you
  can construct it) a record split across two reads. Assert whatever the current code does —
  this pins behavior, it does not judge it.
- `readAssets()` / `readPackageSummary()` populate `manager.assets` / package summary as they
  currently do.

**Verify**: `pnpm -C packages/rolldown exec vitest run events-reader` → all pass.

### Step 3: Characterize the log cache round-trip

Create `log-cache.test.ts`. Parse a fixture, serialize via `log-cache`, restore into a fresh
reader/manager, and assert the restored state deep-equals the original (modules, chunks,
assets, metrics, byte cursors). Add an eviction/limit case if the cache exposes one.

**Verify**: `pnpm -C packages/rolldown exec vitest run log-cache` → all pass.

## Test plan

- Extend `events-reader.test.ts` (Step 2) + new `log-cache.test.ts` (Step 3), fixtures in
  `__tests__/fixtures/`. Pattern: the existing `events-reader.test.ts`.
- Verification: `pnpm -C packages/rolldown exec vitest run events-reader log-cache` → all pass.

## Done criteria

ALL must hold:
- [ ] Fixtures exist; parser tests cover eventCount, module/chunk/asset population, incremental read, and CR/LF + partial-line boundaries
- [ ] `log-cache` round-trip test passes (serialize → restore → deep-equal)
- [ ] No source file under `src/node/rolldown/` changed (tests + fixtures only)
- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0
- [ ] Any suspected bug found while testing is noted in the PR, not fixed here
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- The parser's line/offset logic makes a faithful on-disk fixture test impractical without
  refactoring — in that case cover as much as feasible via `handleEvent`-level tests and
  report what could not be characterized (this bounds plan 016's risk).
- `@rolldown/debug` `Event` shapes differ so much from the existing test's example that
  building fixtures requires guessing field names — inspect the installed type first; if
  still unclear, report.

## Maintenance notes

- These tests are the safety net for plan 016 (god-class breakup). Keep them at the public
  API level (`read`, `readSummary`, `manager.*`) so an internal refactor doesn't require
  rewriting them.
- Reviewer: confirm the tests assert *current* behavior and don't encode a "should be" that
  the code doesn't do.
