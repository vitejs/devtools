# Plan 013: Triage the dependency-audit advisories in the Nuxt UI toolchain

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- pnpm-workspace.yaml pnpm-lock.yaml`
> The advisory set changes with the lockfile; re-run the audit (Step 1) rather than
> trusting the numbers below verbatim.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: dependencies / security
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`pnpm audit --prod` at the repo root reported (at planning time) **1 critical, 20 high,
9 moderate, 1 low**, concentrated in the **Nuxt UI build toolchain** — dev-server and
static-SPA-build dependencies, not the published core WS/RPC runtime. Notable entries:
- Critical `shell-quote` RCE via `@nuxt/devtools > launch-editor`.
- High: `tar` path-traversal/overwrite, `minimatch`/`picomatch`/`brace-expansion` ReDoS,
  `lodash` `_.template` injection, `simple-git` RCE, `flatted` — under
  `packages/ui > nuxt > @nuxt/{devtools,nitro-server,vite-builder}`.
- A separate cluster (`serialize-javascript`, `fast-uri`, `picomatch`) sits inside Vite's
  own dep tree via `@devframes/plugin-inspect > vite` — those resolve upstream when Vite
  bumps its deps and are **not** actionable here.

Real exposure is to contributor/build environments, but the sheer volume means a genuinely
reachable advisory can hide in the noise. The goal is to **shrink the actionable set to
zero** via targeted overrides, and explicitly classify the residual as build-time-only /
upstream-owned so future audits are quick to read.

## Current state

- `pnpm-workspace.yaml` already uses `catalogs` and an `overrides` block (top of file) —
  this is the mechanism for pinning patched transitive versions.
- `packages/ui` is **private/unpublished** (it's the shared UI lib consumed by rolldown/vite
  Nuxt apps at build time). Its Nuxt toolchain is a dev/build dependency, not shipped to
  end users of `@vitejs/devtools`.
- `node_modules` may not be installed in a fresh checkout — Step 0 installs.

## Commands you will need

| Purpose        | Command                          | Expected                       |
|----------------|----------------------------------|--------------------------------|
| Install        | `pnpm install`                   | exit 0                         |
| Audit (prod)   | `pnpm audit --prod`              | advisory list                  |
| Audit (json)   | `pnpm audit --prod --json`       | machine-readable, for triage   |
| Why a dep      | `pnpm why <pkg>`                 | dependency path(s)             |
| Build          | `pnpm build`                     | exit 0                         |
| Typecheck      | `pnpm typecheck`                 | exit 0                         |

## Scope

**In scope**:
- `pnpm-workspace.yaml` (`overrides` and/or `catalogs` — add patched-version pins)
- `pnpm-lock.yaml` (regenerated)
- A short note in `docs/` or `CONTRIBUTING.md` recording the build-time-only / upstream
  classification of any residual advisories (optional but recommended)

**Out of scope**:
- Bumping `vite` itself or `@devframes/plugin-inspect` to chase their transitive advisories
  (upstream-owned — record, don't fix).
- Application source code.

## Git workflow

- Branch: `deps/audit-triage`.
- Conventional commit, e.g. `deps: pin patched transitive deps to clear audit advisories`.
- **Do NOT bump any package version, run `pnpm update`, or change the lockfile beyond the
  targeted overrides. This is not a release.** Do NOT push/PR unless instructed.

## Steps

### Step 0: Install and reproduce the audit

`pnpm install`, then `pnpm audit --prod --json > /tmp/audit-before.json`. This is the
baseline. Read it; classify each advisory by dependency path (`pnpm why <pkg>`).

### Step 1: Classify each advisory

For each advisory, tag it:
- **(A) Actionable via override** — a patched version exists and the dependency path is
  under the Nuxt UI toolchain or another first-party-controlled transitive.
- **(B) Upstream-owned** — path goes through `vite` / `@devframes/plugin-inspect` /
  `devframe`; a fix requires the upstream to bump. Record, do not fix.
- **(C) Unreachable / dev-only-and-harmless** — e.g. a linter-only dep.

Write the classification table into the PR description.

### Step 2: Add targeted overrides for (A)

For each (A) advisory, add a pin in `pnpm-workspace.yaml` `overrides` to the lowest
patched version that clears it (e.g. `shell-quote`, `tar`, `minimatch`, `lodash`,
`simple-git`, `brace-expansion`, `flatted` — only those actually flagged and patchable).
Prefer overriding the leaf dependency to the patched semver range over bumping the whole
Nuxt toolchain (smaller blast radius). Run `pnpm install` after each batch.

**Verify**: `pnpm audit --prod` shows the (A) advisories cleared.

### Step 3: Validate the build still works

The overrides change transitive versions in the build toolchain — verify nothing breaks:
`pnpm build` (turbo, builds all packages incl. the Nuxt UIs) and `pnpm typecheck`.

**Verify**: both exit 0.

### Step 4: Record the residual

`pnpm audit --prod --json > /tmp/audit-after.json`. The residual should be only (B)/(C).
Add a short note (docs or CONTRIBUTING) stating that remaining advisories are build-time,
unpublished-path, or upstream-owned, with a pointer to re-run `pnpm audit --prod`.

**Verify**: the residual set contains no (A) items.

## Test plan

No unit tests. Verification is: audit diff (before → after) clears all actionable items,
and `pnpm build` + `pnpm typecheck` still pass with the overrides in place.

## Done criteria

ALL must hold:
- [ ] Every advisory classified (A)/(B)/(C) in the PR
- [ ] All (A) advisories cleared via targeted `overrides`
- [ ] `pnpm build` and `pnpm typecheck` exit 0 with the overrides applied
- [ ] Residual advisories documented as build-time / upstream-owned
- [ ] Only `pnpm-workspace.yaml`, `pnpm-lock.yaml` (+ optional doc) modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- An override needed to clear a critical/high advisory forces a Nuxt/vite-builder major
  bump that breaks `pnpm build` — report the conflict; do not force a broken build.
- The critical `shell-quote` advisory cannot be overridden without breaking
  `@nuxt/devtools`'s editor launcher — report and leave it classified (B) with a note.
- A supposedly build-time advisory turns out to be on the **published** `@vitejs/devtools`
  runtime path (`pnpm why` shows it under `packages/core` runtime deps, not build) — that
  escalates priority; report before proceeding.

## Maintenance notes

- Overrides are maintenance debt — add a comment next to each pin naming the advisory it
  clears, so it can be removed when the upstream toolchain catches up.
- Renovate (`renovate.json` exists) will keep bumping; re-run `pnpm audit --prod` after
  major dependency PRs.
- Reviewer: confirm no override silently downgrades a package or pins the published runtime.
