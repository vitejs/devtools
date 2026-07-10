# Plan 015: Consolidate triplicated `color`/`format`/`filepath` utils into `packages/ui`

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/ui/src/utils packages/rolldown/src/app/utils packages/vite/src/app/utils`
> Compare "Current state" against live code first.

## Status

- **Priority**: P3
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: plans/001 (test suite terminates)
- **Category**: tech-debt
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`color.ts`, `format.ts`, and `filepath.ts` are re-implemented across three locations:
`packages/ui/src/utils/`, `packages/rolldown/src/app/utils/`, and `packages/vite/src/app/utils/`.
`bytesToHumanSize`, `normalizeTimestamp`, `toTree`, `parseReadablePath` etc. are duplicated,
and `color.ts` has **already drifted**: `packages/vite/src/app/utils/color.ts` collapsed the
`predefinedColorMap` and dropped the branding hues (`bailout`/`vite1`/`vite2`/`rolldown`/`nuxt`)
and the hex-vs-hue branch that `packages/rolldown/src/app/utils/color.ts` still carries. Three
sources of truth mean inconsistent rendering and fixes that land in only one copy. `packages/ui`
exists precisely to host shared UI utilities. This plan consolidates the utilities (low-risk,
pure functions with existing tests) — the larger component dedup is plan 017.

## Current state

- `packages/ui/src/utils/`: `color.ts`, `format.ts`, `__tests__/color.test.ts` (no `filepath.ts` yet).
- `packages/rolldown/src/app/utils/`: `cache.ts`, `color.ts`, `filepath.ts`, `format.ts`, `icon.ts`,
  `is.ts`, `__tests__/{cache,color,filepath,format,icon,is}.test.ts` — **the tested, canonical copies**.
- `packages/vite/src/app/utils/`: `cache.ts`, `color.ts`, `filepath.ts`, `format.ts`, `icon.ts`
  — **untested copies**; `color.ts` is the drifted/collapsed one.
- The rolldown `color.ts` is the richer/correct version (keeps `predefinedColorMap` with branding
  hues and the hex-string-vs-hue-number branch). Treat **rolldown's copies as canonical** when
  reconciling.
- `packages/ui` publishes utilities under `@vitejs/devtools-ui/utils` (verify the exact subpath /
  export map in `packages/ui/package.json`); `color` already partially lives in ui.
- UnoCSS preset export is `presetDevToolsUI` from `@vitejs/devtools-ui/unocss` (unrelated, do not touch).

## Commands you will need

| Purpose        | Command                                                       | Expected    |
|----------------|---------------------------------------------------------------|-------------|
| Find usages    | `git grep -n "utils/color\|utils/format\|utils/filepath" -- 'packages/rolldown/**' 'packages/vite/**'` | list |
| Test ui        | `pnpm -C packages/ui exec vitest run`                         | pass        |
| Test rolldown  | `pnpm -C packages/rolldown exec vitest run`                   | pass        |
| Build          | `pnpm build`                                                  | exit 0      |
| Typecheck      | `pnpm typecheck`                                              | exit 0      |

## Scope

**In scope**:
- `packages/ui/src/utils/` — become the single home for `color.ts`, `format.ts`, `filepath.ts`
  (and their tests, moved/merged from rolldown's `__tests__`)
- `packages/ui/package.json` export map (if a new subpath is needed)
- `packages/rolldown/src/app/utils/` and `packages/vite/src/app/utils/` — replace the three
  duplicated files with re-exports from `@vitejs/devtools-ui` (or delete + update imports)
- Import sites in both apps

**Out of scope** (defer to plan 017 / later):
- `cache.ts`, `icon.ts`, `is.ts` (start with the three clearly-duplicated pure utils; if
  `cache`/`icon`/`is` are byte-identical you may fold them in, but do not force it)
- The `components/flowmap/*` and other component duplication (plan 017)

## Git workflow

- Branch: `refactor/consolidate-app-utils`.
- Conventional commits per util (color, then format, then filepath).
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Reconcile `color.ts` on the rolldown (canonical) version

Compare the three `color.ts` copies (`diff`). Move the **rolldown** version's logic into
`packages/ui/src/utils/color.ts` (it already exists in ui — merge so the richer
`predefinedColorMap` + hex/hue branch wins). Move rolldown's `__tests__/color.test.ts` cases
into `packages/ui/src/utils/__tests__/color.test.ts` (merge with ui's existing color test).

**Verify**: `pnpm -C packages/ui exec vitest run color` → pass (including the branding-hue cases).

### Step 2: Move `format.ts` and `filepath.ts` into ui with their tests

Create `packages/ui/src/utils/filepath.ts`; ensure `packages/ui/src/utils/format.ts` is the
canonical (rolldown) version. Move rolldown's `format`/`filepath` tests into
`packages/ui/src/utils/__tests__/`. Export all three from the package's utils entry (check/extend
`packages/ui/package.json` exports).

**Verify**: `pnpm -C packages/ui exec vitest run` → pass; `pnpm typecheck` → exit 0.

### Step 3: Point both apps at the shared utils

In `packages/rolldown/src/app` and `packages/vite/src/app`, replace the local `color.ts`/
`format.ts`/`filepath.ts` with either deletion + updated imports (`from '@vitejs/devtools-ui/...'`)
or thin re-export files if many import sites reference the local path. Use the grep from
"Commands" to find every import site and update it. Delete the now-redundant local test copies
(their cases now live in ui).

**Verify**: `pnpm build` → exit 0 (both Nuxt apps build); `pnpm typecheck` → exit 0;
`pnpm -C packages/rolldown exec vitest run` and `pnpm -C packages/vite exec vitest run` → pass.

### Step 4: Confirm no behavioral drift for vite

Because vite's `color.ts` was the collapsed one, switching it to the canonical version changes
its palette to include branding hues. Confirm this is the intended (correct) behavior — it aligns
vite with rolldown. Note it explicitly in the PR (it is a deliberate visual change).

**Verify**: `pnpm build` → exit 0.

## Test plan

- Consolidated tests live in `packages/ui/src/utils/__tests__/` (color, format, filepath),
  merged from rolldown's existing suites — so both apps are now covered by one suite.
- Verification: `pnpm -C packages/ui exec vitest run` passes; both apps build and typecheck.

## Done criteria

ALL must hold:
- [ ] `color.ts`/`format.ts`/`filepath.ts` exist once, in `packages/ui`, with merged tests
- [ ] `packages/rolldown` and `packages/vite` import them from `@vitejs/devtools-ui` (no local duplicates)
- [ ] The canonical (rolldown) `color` logic wins; vite's palette now matches (noted in PR)
- [ ] `pnpm build`, `pnpm typecheck` exit 0; ui + both app test suites pass
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- The `format`/`filepath` copies have **drifted** (not just duplicated) — reconcile carefully and
  note every semantic difference; if a difference is load-bearing for one app, parameterize rather
  than pick one blindly, or STOP and report.
- `packages/ui`'s export map / build (tsdown) can't expose the new subpath without config changes
  beyond a one-line export addition — report the build-config need.
- An import path change cascades into `packages/core` (which consumes the apps) — rescope.

## Maintenance notes

- This is the low-risk first half of the larger dedup (plan 017 handles components). Land it first.
- Reviewer: verify no app-local util file remains that shadows the shared one, and that the vite
  palette change is intentional.
