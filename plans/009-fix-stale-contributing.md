# Plan 009: Fix stale `CONTRIBUTING.md` (removed `packages/rpc`, wrong kit paths)

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- CONTRIBUTING.md packages/kit`
> Compare "Current state" against live code first.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs/dx
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`CONTRIBUTING.md` still documents a `packages/rpc` package (`@vitejs/devtools-rpc`) and
kit "key files" that no longer exist after the devframe migration — RPC now comes from
`devframe/rpc` (see `AGENTS.md` and `packages/core/src/node/ws.ts:12-13`). A wrong doc is
worse than a missing one: it sends new contributors and agents to look for packages and
files that were removed, giving them an incorrect mental model of where RPC lives.

## Current state

- `packages/rpc` **does not exist**: `ls packages` → `core kit rolldown ui vite webext`.
- `packages/kit/src` contains `client/`, `define/`, `node/`, `types/` (not `index.ts`/`client.ts`/`utils/`).
- Stale content in `CONTRIBUTING.md`:
  - **Line ~60** (kit "Key files"): `**Key files**: `src/index.ts`, `src/client.ts`, `src/utils/`` — none of these exist.
  - **Lines ~91-100**: a full `### `packages/rpc` - `@vitejs/devtools-rpc`` section
    ("Typed RPC wrapper over `birpc`…", "**Key files**: `src/index.ts`, `src/client.ts`, `src/server.ts`, `src/presets/ws/`").
  - **Line ~135** (Package Guidelines): `- **rpc**: Keep methods type-safe, document new methods, test client/server`.
- Authoritative current layout is in `AGENTS.md` (the "Packages" table and "Architecture"
  section) and mirrored in `CLAUDE.md`. RPC lives in `devframe/rpc`; kit re-exports
  `defineRpcFunction`. Use these as the source of truth.

## Commands you will need

| Purpose        | Command                                | Expected                 |
|----------------|----------------------------------------|--------------------------|
| Confirm absent | `ls packages` ; `ls packages/kit/src`  | no `rpc`; kit dirs listed |
| Lint           | `pnpm lint`                            | exit 0                   |

## Scope

**In scope**:
- `CONTRIBUTING.md` (the three stale locations only)

**Out of scope**:
- `AGENTS.md` / `CLAUDE.md` (already correct — use as reference, do not rewrite).
- Any docs under `docs/`.
- Restructuring/rewriting the whole CONTRIBUTING beyond the stale facts.

## Git workflow

- Branch: `docs/fix-stale-contributing`.
- Conventional commit, e.g. `docs: correct CONTRIBUTING package layout after devframe migration`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Correct the kit "Key files"

Replace the kit key-files line with the real layout, e.g.:
`**Key files**: `src/node/` (context + `createPluginFromDevframe`), `src/client/`, `src/define/`, `src/types/``.
Cross-check against `AGENTS.md`'s kit row and `packages/kit/src`.

### Step 2: Replace the `packages/rpc` section

Delete the `### `packages/rpc` - `@vitejs/devtools-rpc`` section (heading through its
Key files line). RPC is no longer a workspace package; it comes from the external
`devframe/rpc`. Either remove the section entirely or replace it with a one-line pointer:
"RPC is provided by the external `devframe` package (`devframe/rpc`); define functions
with `defineRpcFunction` from `@vitejs/devtools-kit` and namespace their ids — see
`AGENTS.md`." Keep the surrounding sections intact.

### Step 3: Fix the Package Guidelines bullet

Remove or rewrite the `- **rpc**: …` guideline bullet so it no longer references a
non-existent package. If a guideline about RPC is still useful, phrase it about
`defineRpcFunction` usage (namespaced ids, type safety) rather than a package.

**Verify**: `pnpm lint` → exit 0 (markdown is linted by the antfu config). Manually
confirm no remaining `packages/rpc` / `devtools-rpc` string:
`git grep -n "packages/rpc\|devtools-rpc" -- CONTRIBUTING.md` returns nothing.

## Test plan

No code tests. Verification is grep (no stale references remain) + lint pass.

## Done criteria

ALL must hold:
- [ ] No `packages/rpc` / `@vitejs/devtools-rpc` reference remains in `CONTRIBUTING.md`
- [ ] Kit "Key files" reflect the real `src/` layout
- [ ] The `rpc` package-guideline bullet is removed or rephrased away from a package
- [ ] `pnpm lint` exits 0
- [ ] Only `CONTRIBUTING.md` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- `packages/rpc` actually exists in the tree (drift — the migration was reverted).
- `CONTRIBUTING.md` no longer contains the stale sections (already fixed).

## Maintenance notes

- Keep `CONTRIBUTING.md`'s package list in sync with `AGENTS.md`'s "Packages" table on
  any future package add/remove.
- Reviewer: skim for any other post-migration staleness (e.g. mentions of `self-inspect`,
  which was replaced by `@devframes/plugin-inspect`).
