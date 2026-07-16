# Plan 017: Deduplicate the parallel Rolldown/Vite Nuxt apps into `packages/ui`

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/rolldown/src/app packages/vite/src/app packages/ui/src`
> Compare "Current state" against live code first.
>
> **Prerequisite gate**: plan 015 (shared utils) should be landed first so the utility
> layer is already unified before you move components on top of it.

## Outcome (executed)

Beyond promoting the byte-identical surface, this pass also:

- **Reorganized `packages/ui/src/components` into PascalCase category folders**
  (`Display/`, `Data/`, `Chart/`, `Panel/`, `Plugins/`, `Banner/`, plus the new
  `Code/`, `Flowmap/`, `Visual/`) with folder-prefixed filenames, mirroring
  [`antfu/design`](https://github.com/antfu/design).
- **Finished the util layer 015 left open**: promoted `cache` (rolldown's canonical
  `TupleMap` impl) and reconciled `icon` into `packages/ui`; both apps' copies are
  re-export shims and their tests folded into ui.
- **Promoted the 12 byte-identical files**: `Flowmap/{FlowmapNode,FlowmapExpandable,
  FlowmapNodePluginInfo}`, `Display/{DisplayFileIcon,DisplayGraphHoverView}`,
  `Code/CodeDiffEditor`, `composables/monaco`, `state/flowmap`,
  `worker/diff(+diff.worker)`, `plugins/floating-vue`. Apps consume via `.ts`
  re-export shims (auto-import tags preserved). `CodeDiffEditor` was decoupled from
  the app-specific settings store via a `line-wrap` prop + `diff-panel-size` model
  bound by a thin per-app wrapper; `floating-vue` is exposed as a Vue-level
  `installFloatingVue()` wrapped by each app's Nuxt plugin.
- **Reconciled the cleanly-mergeable drifted pairs**: `DisplayFileSizeBadge`
  (whitespace), `DisplayHighlightedPath` (style-only), `VisualLoading` (banner-only,
  now a `#banner` slot).
- **Added Storybook stories** for the shared presentational primitives (see the
  `storybook/` workspace).

### Left app-local (STOP condition: analyzer-specific data model)

These drifted pairs are written against each analyzer's distinct domain model
(rolldown `SessionContext`/`Rolldown*` from `~~/shared/types` + `session.meta.cwd`
vs vite `Vite*` from `~/types/{modules,plugins,chart}` + `root`), so they cannot be
parameterized without a shared module/plugin abstraction that does not yet exist.
They remain per-app: `flowmap/{NodeModuleInfo,ModuleFlow,ModuleFlowDetails,
ModuleFlowTimeline,PluginFlow,PluginFlowTimeline}`, `chart/ModuleFlamegraph`,
`modules/{Graph,FlatList,DetailedList,Folder,BuildMetrics}`,
`data/{ModuleDetailsLoader,PluginDetailsLoader,PluginDetailsTable,
ModuleImportRelationships}`, `display/{VirtualTree,ModuleId}`. Genuinely app-specific
by nature: `app.vue`, `pages/index.vue`, `composables/{rpc,chart}`, `types/chart`,
`state/settings`. Unifying these is gated on a future shared analyzer data model.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/015 (utils consolidated)
- **Category**: tech-debt / architecture
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`packages/rolldown/src/app` and `packages/vite/src/app` share **44 same-path source files**;
**12 are byte-identical** and 32 have drifted. Every cross-cutting UI fix (monaco theming, diff
worker, virtual tree, flowmap nodes) must be made twice, and the drifted pairs guarantee the two
analyzers silently diverge. `packages/ui` already exists as the shared-component home but is
bypassed for most of this surface. This plan promotes the shared components into `packages/ui` so
both apps consume one source — and makes a future third analyzer cheap. It is deliberately staged:
the **12 byte-identical files first** (mechanical, low risk), then the drifted pairs one at a time.

## Current state

- **Byte-identical across both apps** (verified via `diff -q`), safe to promote first:
  - `composables/monaco.ts`
  - `plugins/floating-vue.ts`
  - `state/flowmap.ts`
  - `components/code/DiffEditor.vue`
  - `components/flowmap/Expandable.vue`
  - `components/flowmap/NodePluginInfo.vue`
  - `components/flowmap/Node.vue`
  - `components/visual/Loading.vue`
  - `components/display/GraphHoverView.vue`
  - `components/display/FileIcon.vue`
  - `worker/diff.ts`
  - `worker/diff.worker.ts`
- **Drifted pairs** (same path, different content — reconcile individually): e.g.
  `components/flowmap/ModuleFlowTimeline.vue` (341L vs 394L), `components/data/PluginDetailsLoader.vue`
  (385L vs 403L), `composables/chart.ts`, `components/display/VirtualTree.vue`,
  `components/data/ModuleImportRelationships.vue`, and ~27 others. Enumerate the full set in Step 1.
- `packages/ui` (`@vitejs/devtools-ui`, private) already hosts shared components
  (e.g. `DisplayModuleGraph.vue`) and the `presetDevToolsUI` UnoCSS preset. Both apps already depend on it.
- Both apps are Nuxt 4 + Vue 3 Composition API.

## Commands you will need

| Purpose        | Command                                                                 | Expected |
|----------------|-------------------------------------------------------------------------|----------|
| List identical | see Step 1 script                                                       | 12 files |
| Test ui        | `pnpm -C packages/ui exec vitest run`                                    | pass     |
| Build          | `pnpm build`                                                            | exit 0   |
| Typecheck      | `pnpm typecheck`                                                        | exit 0   |
| Dev (visual)   | `pnpm dev:rolldown` / `pnpm dev:vite` (bind `--host 0.0.0.0` for preview)| render   |

## Scope

**In scope**:
- `packages/ui/src/` — new home for the promoted components/composables/workers
- `packages/ui/package.json` exports (as needed)
- `packages/rolldown/src/app` and `packages/vite/src/app` — replace promoted files with imports
- Import sites in both apps

**Out of scope**:
- App-specific pages/routes and anything genuinely unique to one analyzer.
- The utils (done in plan 015).
- Behavior changes / redesigns — this is consolidation, not a UI rework.

## Git workflow

- Branch: `refactor/dedupe-nuxt-apps`.
- **Commit per promoted file (or small cohesive group).** After each, both apps must build.
  Message style: `refactor(ui): promote <Component> shared by rolldown and vite`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Re-enumerate identical vs drifted (do not trust the list blindly)

Run:
```
cd packages
for f in $(cd rolldown/src/app && find . -type f \( -name '*.ts' -o -name '*.vue' \)); do
  if [ -f "vite/src/app/$f" ]; then
    diff -q "rolldown/src/app/$f" "vite/src/app/$f" >/dev/null 2>&1 && echo "IDENTICAL: $f" || echo "DRIFTED: $f"
  fi
done
```
Record the current IDENTICAL and DRIFTED lists in the PR. Proceed only with what's actually identical.

### Step 2: Promote the byte-identical files (mechanical)

For each IDENTICAL file: move it into the corresponding location under `packages/ui/src/`,
export it (extend `packages/ui/package.json` exports / the component index as the repo convention
dictates — check how existing ui components are exposed), and replace both app copies with imports
from `@vitejs/devtools-ui`. Mind workers (`worker/diff.worker.ts`) — Nuxt/Vite worker imports may
need a specific import form; preserve how each app currently loads them.

**Verify after each file/group**: `pnpm build` → exit 0; `pnpm typecheck` → exit 0. Spot-check the
component renders in `pnpm dev:rolldown` / `pnpm dev:vite`.

### Step 3: Reconcile drifted pairs one at a time

For each DRIFTED file: `diff` the two versions, decide the canonical behavior (prefer the tested /
more complete version; where the two legitimately differ per-analyzer, parameterize via props/slots
rather than forking). Promote the reconciled component to `packages/ui`, wire both apps to it with
the per-app differences passed in. **One component per commit**, each verified.

**Verify per component**: `pnpm build` exit 0; visual check both apps.

### Step 4: Final sweep

Confirm no same-path duplicate remains for the promoted set (re-run Step 1 script; the promoted
files should no longer appear as IDENTICAL/DRIFTED because they now live in ui). Ensure both apps'
test suites and the ui suite pass.

**Verify**: `pnpm build`, `pnpm typecheck` exit 0; `pnpm -C packages/ui exec vitest run`,
`pnpm -C packages/rolldown exec vitest run`, `pnpm -C packages/vite exec vitest run` pass.

## Test plan

- Existing ui/app test suites are the regression gate. Add tests when promoting a component that
  had tests in only one app (fold them into ui).
- Visual verification via the dev servers for the flowmap/graph/diff components (they have little
  unit coverage).
- Verification: full build + typecheck + all three suites green.

## Done criteria

ALL must hold:
- [ ] The 12 (re-verified) byte-identical files live once in `packages/ui`, imported by both apps
- [ ] Drifted pairs reconciled to a single `packages/ui` component (per-app diffs parameterized)
- [ ] No same-path duplicate remains for the promoted set (Step 1 script)
- [ ] `pnpm build`, `pnpm typecheck` exit 0; ui + both app suites pass
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- Plan 015 is not landed (utils still duplicated) — the components will pull in the app-local utils
  and you'll be chasing a moving target.
- A "drifted" pair differs in a way that can't be parameterized cleanly (genuinely different
  behavior the two analyzers need) — leave it app-local, note why, and move on.
- Promoting a worker breaks the build under Nuxt's worker handling — report the worker-import
  constraint rather than forcing it.
- The set of identical files has changed substantially since planning (Step 1 output differs a lot
  from "Current state") — proceed off the live Step 1 output and note the divergence.

## Maintenance notes

- After this lands, new shared analyzer components should be added to `packages/ui` directly, not
  copied per app — call this out in `CONTRIBUTING.md` / `AGENTS.md` if not already stated.
- This directly enables direction option DIR-01/DIR-02 (finishing `packages/vite` on a shared kit).
- Reviewer: review per-commit; verify each promotion is behavior-preserving and both apps still render.
