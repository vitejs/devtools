# Plan 018: Migrate the oxc DevTools UI onto `@vitejs/devtools-ui` + UnoCSS

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat main..HEAD -- packages/oxc packages/ui`
> Compare "Current state" against live code first — PR A (below) may already be landed.

## Status

- **Priority**: P3
- **Effort**: L (split across three PRs)
- **Risk**: MED
- **Depends on**: — (relates to 017; not blocked by it)
- **Category**: tech-debt / architecture / design
- **Planned at**: 2026-07-16

## Why this matters

`@vitejs/devtools-oxc` is the **only** UI package in the repo not on the shared stack.
`packages/rolldown` and `packages/vite` are both Nuxt 4 SPAs styled by UnoCSS via
`presetDevToolsUI` from `@vitejs/devtools-ui`, consuming shared components, semantic
shortcuts, dark-mode, fonts and the dotted-grid background. oxc instead ships a Nuxt 4
SPA on **`@nuxt/ui` v4 + Tailwind v4**, borrowing only a banner from the shared package.
Because of that divergence the root `AGENTS.md` keeps oxc **out of the turbo
build/typecheck/lint/export-snapshot gates** "pending a UI-stack decision".

This plan **is** that decision: move oxc onto UnoCSS + `@vitejs/devtools-ui`, align its
look and feel to the other analyzers, and bring it into the CI gates.

## Locked decisions (from planning interview)

1. **Scope = minimal stack swap.** Keep oxc's existing top-nav + `container mx-auto`
   page layout. "Align to rolldown" here means shared *tokens, fonts, dark-mode,
   dotted-grid background, severity ramp, icons* — **not** adopting rolldown's
   `PanelSideNav` shell or glass slide-over detail panels.
2. **Directory layout = `src/app`.** Restructure the client from `packages/oxc/client/`
   to `packages/oxc/src/app` and run `nuxi … src`, mirroring rolldown/vite. **(PR A — done.)**
3. **New primitives live upstream in `@vitejs/devtools-ui`.** `@nuxt/ui` gave oxc
   overlays/forms/containers with no shared equivalent; build the reusable replacements
   (`Card`, `Modal`, `Checkbox`, `EmptyState`) in `packages/ui` so every analyzer benefits.
4. **Wire CI gates + set brand color** as part of the migration. Derive the oxc
   `primary` scale from the `BannerOxcDevTools` accent (today it is `cyan`).

## Reference implementations to copy

- **Plumbing** (uno.config, nuxt.config, scripts, global.css import, floating-vue plugin,
  monaco composable, dark-mode) → `packages/vite` (minimal) and `packages/rolldown`.
- **Look & feel tokens** → `@vitejs/devtools-ui/unocss/shared-shortcuts` +
  `unocss/shortcuts` (already provide `bg-dots`, `color-scale-*`, `bg-base`/`color-base`/
  `border-base`/`bg-glass`, `btn-action`, `badge-color-*`).

## The `@nuxt/ui` → shared/local mapping (drives PR C)

| `@nuxt/ui` used | Where | Replacement |
|---|---|---|
| `UApp` / `UMain` | `app.vue` | drop; plain shell like rolldown `app.vue` |
| `UCard` | index, SessionCard, FileCard, SummaryCard | new shared `Card` |
| `UButton` | Back, ErrorTooltip, index | `btn-action`/`btn-action-sm` or shared `DisplayIconButton` |
| `UBadge` | SessionCard, FileCard, index | shared `DisplayBadge`/`DisplayNumberBadge` + `badge-color-*` |
| `UModal` | SummaryCard (config viewer) | new shared `Modal` |
| `UTooltip` | LineError, SummaryCard | `floating-vue` `v-tooltip` |
| `UInput` | Search | shared `DataSearchPanel` or styled `input` |
| `UCheckbox` | lint/report ("Hide Passed") | new shared `Checkbox` |
| `UEmpty` | lint/report | new shared `EmptyState` |
| `UIcon` | throughout | `i-ph-*` / `i-carbon-*` classes |
| `useColorMode()` | ColorModeButton, config pages | shared `isDark`/`toggleDark` (storageKey `vite-devtools-color-scheme`) |

Delete-not-migrate (already in shared layer): oxc's local `.bg-dots` and
`.color-scale-*` in `app/assets/css/main.css`; hand-rolled duration coloring in
`SummaryCard` (use shared `DisplayDuration`); the `.shiki { … var(--ui-bg) }` override
(rewrite against `bg-code`/`bg-base`).

## PR breakdown

### PR A — directory restructure (DONE in this branch)

Pure move, still on `@nuxt/ui`; the package builds identically from the new location.

- `git mv packages/oxc/client/{app,modules,public,nuxt.config.ts,tsconfig.json}` → `packages/oxc/src/…`
- Removed `client/{package.json,tsdown.config.ts,.oxlintrc.json,.oxfmtrc.json}`
  (client oxc-configs were byte-identical to the package-root ones; the empty nested
  `package.json` only carried scripts now replaced).
- `src/nuxt.config.ts`: `srcDir: 'app'`; `nitro.output.dir` `'../dist/client'` → `'../dist'`
  (static preset now emits to `dist/public`).
- `src/dirs.ts`: `clientPublicDir` `'../dist/client/public'` → `'../dist/public'`.
- `package.json` scripts: `build` → `pnpm dev:prepare && nuxi build src && tsdown`;
  `dev` → `nuxi dev src`; add `dev:prepare` → `nuxi prepare src`; drop `build:cli`/`build:client`.
- `tsdown.config.ts`: `clean: true` → `false` (so tsdown does not wipe the nuxi-built
  `dist/public`); `tsconfig: '../../tsconfig.base.json'` (decouple node dts from the
  app-inclusive root tsconfig).
- `tsconfig.json`: narrow `include` from `["src","bin"]` to node-only paths so `vue-tsc`
  does not try to typecheck the Nuxt app without its generated context.

All app→node relative imports (`../../../src/types`, `../../../src/node/rpc`) and the dev
module's `../vite`/`../../src/vite` import survive unchanged, because `client/**` and
`src/**` sit at the same depth under `packages/oxc`.

**Verified**: `pnpm turbo run build --filter=@vitejs/devtools-oxc` → client prerendered to
`dist/public` (favicon + index.html present), node entries emitted by tsdown; git status is
history-preserving renames + 4 deletions + 4 config edits; build artifacts gitignored.

### PR B — upstream primitives into `@vitejs/devtools-ui`

Add Wind4 components + per-file exports (`./components/*`), styled only with shared
shortcuts so they stay safe for both the Wind4 (Nuxt) and Wind3 (webcomponents) surfaces:

- `Card.vue` — `bg-base border-base rounded` with `header`/`body`/`footer` slots; defaults
  port oxc's old `app.config.ts` card slots.
- `Modal.vue` — teleport overlay + `bg-glass` panel + backdrop/`Escape` close.
- `Checkbox.vue` — styled `v-model` checkbox.
- `EmptyState.vue` — icon + title/description (oxc's local one is a dead 0-byte file).

Add tests where trivial; update any component export snapshot. **Verify**:
`pnpm -C packages/ui exec vitest run`, `pnpm build`, `pnpm typecheck` green; components
render in rolldown/vite dev servers (they must not regress existing consumers).

### PR C — the actual swap + look-and-feel + CI gates

Depends on PR A + PR B.

1. **Plumbing**: `package.json` — remove `@nuxt/ui`, `tailwindcss`; add `unocss`,
   `@unocss/nuxt`, `floating-vue`, `theme-vitesse` (`catalog:*`). Add `src/uno.config.ts`
   (copy vite's) with a local font processor **and** an oxc `primary` scale derived from
   the `BannerOxcDevTools` accent. `nuxt.config.ts`: modules `@unocss/nuxt` + `@vueuse/nuxt`
   (drop `@nuxt/ui`); add `unocss.configFile`; keep `htmlAttrs.class='bg-dots'`, base, port;
   drop the `ui:` block. Delete `app.config.ts`. Rewrite `assets/css/main.css` to
   `@import '@vitejs/devtools-ui/styles/global.css'` + local-only overrides (Monaco;
   `.shiki` → `bg-code`/`bg-base`; floating-vue). Add `plugins/floating-vue.ts` (copy
   rolldown's). In `app.vue` drop `UApp`/`UMain`, keep the `container mx-auto` shell, add
   the side-effect `import '@vitejs/devtools-ui/composables/dark'`.
2. **Component/page migration**: apply the mapping table above page-by-page (Back, Search,
   ColorModeButton, SessionCard → index → lint/report/index + FileCard/SummaryCard →
   lint/report/[id]); replace every inline `dark:` pair with shared semantic shortcuts.
3. **Bespoke, logic-heavy**: `LineError.vue` (preserve the ASCII underline math; `UTooltip`
   → `v-tooltip`), `ErrorTooltip.vue`, `Shiki.vue`; `lint/config.vue` + `fmt/config.vue`
   (keep the momoa JSON5→docs mapping; align Monaco theme to `isDark`, move Monaco CSS to
   the global overrides — copy rolldown's `composables/monaco.ts` + `styles/cm.css` pattern).
4. **Look & feel pass**: side-by-side vs rolldown (light + dark) via `agent-browser` — DM
   Sans/Mono, Phosphor duotone icons, dotted-grid bg, severity ramp, `op-fade`/`op-mute`,
   scrollbar tokens, `bg-glass` on the config Modal.
5. **CI gates + cleanup**: add oxc to `tsconfig.json` references (`./packages/oxc/src/tsconfig.json`)
   and remove the `../../../oxc/**/*` exclude in rolldown/vite nuxt typecheck config; wire
   oxc into the turbo `typecheck`/`lint`/export-snapshot tasks (build task already exists);
   update root `AGENTS.md` (drop "pending a UI-stack decision" / "out of the gates" notes).
   Remove any now-dead components (`LoadingState`/`CongratState` if unused).

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Build oxc (+deps) | `pnpm turbo run build --filter=@vitejs/devtools-oxc` | exit 0 |
| Dev (visual, bind host) | `pnpm -C packages/oxc dev` (Nuxt dev server, port 4448) | renders |
| ui tests | `pnpm -C packages/ui exec vitest run` | pass |
| Full gates | `pnpm lint && pnpm test && pnpm typecheck && pnpm build` | exit 0 |

## Done criteria

ALL must hold:
- [ ] (PR A) client lives under `packages/oxc/src/app`; package builds from the new layout
- [ ] (PR B) `Card`/`Modal`/`Checkbox`/`EmptyState` in `@vitejs/devtools-ui`, existing consumers unaffected
- [ ] (PR C) no imports of `@nuxt/ui` / `tailwindcss` / `useColorMode` remain in oxc
- [ ] oxc styled by `presetDevToolsUI`; primary color derived from the oxc banner; dark
      toggle uses the shared storage key
- [ ] Monaco config viewers still map cursor→docs (momoa) and follow dark mode;
      `LineError` underline art still aligns per column
- [ ] oxc passes all four CI gates and is no longer excluded in `AGENTS.md`

## STOP conditions

Stop and report if:
- A `@nuxt/ui` feature has no clean shared/local replacement without a redesign that
  exceeds "minimal stack swap" (note it, propose the smallest local component).
- Promoting a primitive to `packages/ui` would regress rolldown/vite (Wind3 vs Wind4
  token divergence) — keep it local to oxc and note why.
- Wiring oxc into the shared Nuxt typecheck surfaces a large pre-existing error backlog —
  land the UI swap first, gate-wiring in a follow-up, and record the backlog.

## Maintenance notes

- After this lands, new oxc UI should build on `@vitejs/devtools-ui` + UnoCSS, never
  `@nuxt/ui`. Update `AGENTS.md`'s package table entry for oxc accordingly.
- This removes the last "pending UI-stack decision" caveat and makes a future shared
  analyzer shell (relates to plan 017) cheaper.
