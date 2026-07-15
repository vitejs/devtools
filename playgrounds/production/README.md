# Production Playground

A **standalone pnpm workspace** that installs Vite DevTools from the **local
built dist**, so you can test the tools the way a real user consumes them —
from the packaged artifacts, with no monorepo aliases, `src` imports, or
`workspace:` links.

The regular playground at `packages/core/playground` aliases everything to
source for fast iteration. This one does the opposite: it packs the published
packages into tarballs and installs them, exercising the real npm install path
and the `dist` output.

## How it works

`scripts/pack-local.mjs` builds the monorepo and runs `pnpm pack` on the five
published packages (`@vitejs/devtools`, `-kit`, `-rolldown`, `-vite`,
`-vitest`). `pnpm pack` rewrites each package's `workspace:*` and `catalog:*`
protocols into concrete versions, producing the exact tarballs npm would serve.
The tarballs land in `.tarballs/` under stable names; `pnpm-workspace.yaml`
points `@vitejs/devtools` and every inter-package dependency at them through
`overrides`. Everything else (devframe, `@devframes/*`, vite, vue) resolves
from the public registry — just like a real install.

Its own `pnpm-workspace.yaml` keeps it isolated from the monorepo above, so a
`pnpm install` here builds an independent dependency tree with its own lockfile.

## Usage

From this directory:

```sh
# Build the monorepo, pack the packages, and install them
pnpm run setup

# Start the dev server (embedded DevTools panel)
pnpm dev

# Or produce a production build (standalone DevTools output)
pnpm build
```

To re-pack after changing package source without rebuilding untouched packages,
`pnpm run setup` re-runs the turbo build (cached) and re-packs. If you already
have fresh `dist` output and only want to re-pack + reinstall:

```sh
pnpm run setup:no-build
```

If pnpm doesn't pick up freshly re-packed tarballs, force it:

```sh
pnpm install --no-frozen-lockfile --force
```

## Layout

- `scripts/pack-local.mjs` — build + pack the published packages into `.tarballs/`
- `vite.config.ts` — a plain user config importing `DevTools` from `@vitejs/devtools`
- `src/` — a minimal Vue app so the panels have real build/module data
