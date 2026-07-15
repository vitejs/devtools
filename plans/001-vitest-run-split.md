# Plan 001: Split `vitest run` (one-shot) from watch mode

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- package.json CONTRIBUTING.md`
> If `package.json` changed since this plan was written, compare the
> "Current state" excerpt against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

The root `test` script runs `vitest` in **watch mode** (no `run` subcommand). The
documented pre-PR command chain — `pnpm test && pnpm typecheck && pnpm lint`
(`CONTRIBUTING.md` "Workflow" step 2, and `CLAUDE.md`/`AGENTS.md` "Before PRs") —
therefore never terminates locally: `vitest` blocks on the watcher and `typecheck`
never runs. CI only survives because Vitest auto-detects `CI=true` and runs once.
There is no terminating "is the codebase green?" command for a local contributor or
an executor agent, which undermines the verification gate every other plan relies on.

## Current state

- `package.json:20-24` (the relevant scripts):
  ```json
  "lint": "eslint --cache",
  "test": "vitest",
  "test:e2e": "pnpm -C e2e run test",
  "release": "bumpp -r",
  "typecheck": "vue-tsc -b",
  ```
- `vitest.config.ts` defines a multi-project config (`packages/*`, `test`).
- `CONTRIBUTING.md` "Workflow" step 2: "Make changes, run `pnpm test && pnpm typecheck && pnpm lint`".

## Commands you will need

| Purpose   | Command             | Expected on success        |
|-----------|---------------------|----------------------------|
| Run tests | `pnpm test`         | runs once, exits 0         |
| Watch     | `pnpm test:watch`   | starts the vitest watcher  |
| Typecheck | `pnpm typecheck`    | exit 0                     |
| Lint      | `pnpm lint`         | exit 0                     |

## Scope

**In scope**:
- `package.json` (scripts block only)
- `CONTRIBUTING.md` (only if the workflow command needs no change — see Step 2)

**Out of scope** (do NOT touch):
- `vitest.config.ts`, `.github/` CI workflows — CI already runs one-shot via `CI=true`; changing it is unnecessary and risks the pipeline.
- Any test file.

## Git workflow

- Branch: `fix/vitest-run-split` (off the base branch).
- Conventional commit, e.g. `chore: run vitest once by default, add test:watch`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make `test` one-shot and add a `test:watch`

In `package.json`, change:
```json
"test": "vitest",
```
to:
```json
"test": "vitest run",
"test:watch": "vitest",
```
Keep every other script byte-for-byte unchanged and preserve the surrounding
key order/formatting.

**Verify**: `pnpm test` → runs the suite once and exits 0 (does not hang).
Then `pnpm test:watch` → starts the interactive watcher (press `q` to quit).

### Step 2: Confirm the documented workflow now terminates

`CONTRIBUTING.md` step 2 already reads `pnpm test && pnpm typecheck && pnpm lint`;
with `test` now one-shot this command completes. No doc edit is required. Only if
you find the doc still tells contributors to run a watch-based command, correct it
to the terminating form.

**Verify**: `pnpm test && pnpm typecheck && pnpm lint` → runs to completion and
exits 0 (may take a couple minutes; the point is that it *finishes*).

## Test plan

No new test files. The verification is that the existing suite runs once and the
pre-PR chain terminates.

## Done criteria

ALL must hold:
- [ ] `pnpm test` runs the suite and exits (does not stay resident)
- [ ] `pnpm test:watch` starts the watcher
- [ ] `pnpm test && pnpm typecheck && pnpm lint` completes and exits 0
- [ ] `git status` shows only `package.json` (and possibly `CONTRIBUTING.md`) modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- The `package.json` scripts block does not match the "Current state" excerpt.
- `pnpm typecheck` or `pnpm lint` fail on the untouched tree (pre-existing breakage — report it, it is not this plan's job to fix).

## Maintenance notes

- If CI is ever changed to not set `CI=true`, it must call `pnpm test` (now one-shot) rather than relying on auto-detection.
- Reviewer: confirm no other script referenced the old watch behavior of `test`.
