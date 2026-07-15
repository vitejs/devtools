# Plan 002: Reject path traversal in the Rolldown `session` RPC argument

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/rolldown/src/node/rolldown/logs-manager.ts packages/rolldown/src/node/diagnostics.ts`
> If either file changed, compare the "Current state" excerpts against the live
> code before proceeding; on mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (do 001 first only if you want the test to gate via `pnpm test`)
- **Category**: security
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

Every Rolldown build-data RPC function takes a client-supplied `session` string and
passes it, unvalidated, into `join(this.dir, session, 'logs.json' | 'meta.json' | …)`
inside `RolldownLogsManager`. `pathe.join` normalizes `..` segments upward rather than
rejecting them, so a crafted `session` (e.g. containing `..` separators) escapes the
intended `node_modules/.rolldown` directory and makes the events reader parse and
return the contents of files named `logs.json`/`meta.json` anywhere on disk over RPC.
This is a path-traversal / arbitrary-file-read, bounded to those fixed filenames. It
requires a trusted RPC session, so the trust gate limits reach — but defense in depth
at the filesystem boundary is warranted and cheap. There are ~10 caller functions, so
fix it **centrally** in the manager rather than per-caller.

## Current state

- `packages/rolldown/src/node/rolldown/logs-manager.ts` — the only place that joins
  `session` into a path. Relevant methods (all take `session: string`):
  - `loadSession` (line 47): `join(this.dir, session, 'logs.json')` and `join(this.dir, session, 'meta.json')`
  - `loadSessionSummary` (line 58): same two joins
  - `loadAssetSession` (line 69): delegates to `loadSession`
  - `loadPackageSession` (line 75): `join(this.dir, session, 'logs.json')` + `meta.json`
  - `list` (line 19) enumerates the real session directories via `fs.readdir(this.dir)`; each returned `id` is a single directory basename — the set of *legitimate* session ids.
  - Imports at top: `import { join } from 'pathe'`, `import { existsSync } from 'node:fs'`, `import fs from 'node:fs/promises'`.
- Callers passing `session` verbatim (context — you do NOT edit these):
  `packages/rolldown/src/node/rpc/functions/rolldown-get-{asset-details,chunk-info,chunks-graph,module-info,module-transforms,package-details,packages,plugin-details,session-summary,session-compare-summary,session-compare-details,assets-list}.ts`
- Diagnostics file `packages/rolldown/src/node/diagnostics.ts` currently defines
  `RDDT0001` and `RDDT0002`. Next free code is **`RDDT0003`**. Pattern:
  ```ts
  RDDT0002: {
    why: (p: { line: number, error: string, preview: string }) => `Rolldown log reader skipped bad line ${p.line}: ${p.error}\n${p.preview}`,
  },
  ```
- Node-side error convention (`AGENTS.md` "Structured Diagnostics"): never `throw new Error` ad-hoc; define a coded diagnostic and `throw diagnostics.RDDTxxxx(...)`.

## Commands you will need

| Purpose   | Command                                              | Expected            |
|-----------|------------------------------------------------------|---------------------|
| Test (one)| `pnpm -C packages/rolldown test -- logs-manager`     | new tests pass      |
| Typecheck | `pnpm typecheck`                                     | exit 0              |
| Lint      | `pnpm lint`                                          | exit 0              |

(If 001 is not yet landed, use `pnpm -C packages/rolldown exec vitest run logs-manager` so the run terminates.)

## Scope

**In scope**:
- `packages/rolldown/src/node/rolldown/logs-manager.ts`
- `packages/rolldown/src/node/diagnostics.ts` (add `RDDT0003`)
- `packages/rolldown/src/node/rolldown/__tests__/logs-manager.test.ts` (create)
- `docs/errors/RDDT0003.md` (create) and `docs/errors/index.md` (add one row)

**Out of scope** (do NOT touch):
- The individual `rpc/functions/*.ts` callers — the central guard in the manager covers them all.
- `events-reader.ts` — the traversal enters through the manager's path construction, not the reader.

## Git workflow

- Branch: `fix/rolldown-session-path-traversal`.
- Conventional commit, e.g. `fix(rolldown): reject path traversal in session id`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Add the `RDDT0003` diagnostic

In `packages/rolldown/src/node/diagnostics.ts`, add inside `codes`:
```ts
RDDT0003: {
  why: (p: { session: string }) => `Invalid Rolldown session id ${JSON.stringify(p.session)}: it must be a single path segment with no separators or ".." traversal.`,
  fix: 'Pass a session id exactly as returned by the sessions list.',
},
```

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Add a private validator + use it in every path-building method

In `logs-manager.ts`, add a private method to `RolldownLogsManager` and call it at
the top of `loadSession`, `loadSessionSummary`, and `loadPackageSession` (that covers
`loadAssetSession`, which delegates to `loadSession`). Target shape:
```ts
import { isAbsolute, join } from 'pathe'
import { diagnostics } from '../diagnostics'

private assertValidSession(session: string): string {
  // A legitimate session id is a single directory basename produced by list().
  if (
    !session
    || session.includes('/')
    || session.includes('\\')
    || session.includes('\0')
    || session === '.'
    || session === '..'
    || session.split(/[/\\]/).includes('..')
    || isAbsolute(session)
  ) {
    throw diagnostics.RDDT0003({ session })
  }
  return session
}
```
Then in each of `loadSession`/`loadSessionSummary`/`loadPackageSession`, make the first
line `this.assertValidSession(session)`. Keep everything else unchanged.

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Write characterization + rejection tests

Create `packages/rolldown/src/node/rolldown/__tests__/logs-manager.test.ts`. Model the
structure on `packages/core/src/node/__tests__/open-in-editor.test.ts` (describe / it /
`expect(...).rejects.toThrow()`). Point the manager at a temp dir. Cover:
- `loadSession('../../etc')` rejects (traversal).
- `loadSession('/etc')` rejects (absolute).
- `loadSession('a/b')` rejects (separator).
- `loadSession('..')` rejects.
- A valid single-segment id that does not exist reaches the normal reader path (does
  not throw the RDDT0003 diagnostic — it may return an empty/no-meta reader, which is
  fine; assert it does **not** throw the invalid-session error).

Because the reader touches the filesystem, keep the valid-id case pointed at a real
temp directory you create with `node:fs`, or assert only that the thrown error for the
invalid cases is the RDDT0003 one. Do not open real editor/processes.

**Verify**: `pnpm -C packages/rolldown exec vitest run logs-manager` → all pass.

### Step 4: Docs

Create `docs/errors/RDDT0003.md` following the template in `AGENTS.md`
("Structured Diagnostics" → step 3), with `## Message`, `## Cause`, `## Example`,
`## Fix`, `## Source` (source bullet: `packages/rolldown/src/node/rolldown/logs-manager.ts`
— `assertValidSession()` throws this on a malformed session id). Add a row to
`docs/errors/index.md` (`RDDT0003 | error | Invalid Rolldown session id`).

**Verify**: `pnpm lint` → exit 0.

## Test plan

- New file `logs-manager.test.ts` with the five cases in Step 3, modeled on
  `open-in-editor.test.ts`.
- Verification: `pnpm -C packages/rolldown exec vitest run logs-manager` → all pass.

## Done criteria

ALL must hold:
- [ ] `assertValidSession` is called by `loadSession`, `loadSessionSummary`, `loadPackageSession`
- [ ] New tests exist and pass; traversal/absolute/separator inputs reject with `RDDT0003`
- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0
- [ ] `RDDT0003` documented in `docs/errors/RDDT0003.md` and listed in `docs/errors/index.md`
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- `logs-manager.ts` no longer builds paths via `join(this.dir, session, …)` (drift — the traversal may have moved or been fixed).
- A legitimate session id in real usage contains characters your validator rejects (e.g. the reader stores ids with a `:` suffix — check `RolldownEventsReader.get(filepath, '${filepath}:package-summary')` uses a *separate* cache key, not a directory, so this should not affect real session dirs; if it does, report).
- Adding the guard breaks an existing passing test.

## Maintenance notes

- If a future feature legitimately needs nested session paths, replace the single-segment
  rule with a "resolved path must stay within `this.dir`" check (`resolve` + `startsWith`),
  not a loosening of the traversal check.
- Reviewer: confirm every path-building method routes through the validator; a new
  `loadXSession` added later must call it too.
