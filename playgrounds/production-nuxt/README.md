# Production Nuxt Playground

A **standalone pnpm workspace** running a **Nuxt 5** app with **Nuxt DevTools
4**, whose internal Vite DevTools dependency is overridden to the **local
built dist** — so you can test how Vite DevTools behaves when it's running as
Nuxt DevTools' own engine, rather than mounted directly as a Vite plugin.

The playground at `playgrounds/production` installs `@vitejs/devtools`
straight into a plain Vite app. This one exercises the other real-world
integration path: Nuxt DevTools v4 (`@nuxt/devtools@^4.0.0-alpha.9`) depends
directly on `@vitejs/devtools` and `@vitejs/devtools-kit`, so a Nuxt app with
`devtools: { enabled: true }` gets Vite DevTools for free, through Nuxt
DevTools.

Nuxt 5 isn't published to the `nuxt` package's stable dist-tags yet, so
`package.json` pulls it from Nuxt's [nightly release
channel](https://nuxt.com/docs/guide/going-further/nightly-release-channel)
via the `npm:nuxt-nightly@5x` alias — the same channel Nuxt itself documents
for trying the next major early. Nuxt DevTools 4 (`@nuxt/devtools@^4.0.0-alpha.9`)
is already on its regular dist-tags as a pre-release, so it's installed
directly with no alias needed.

## How it works

`scripts/pack-local.mjs` builds the monorepo and packs the six published
Vite DevTools packages into `.tarballs/`, exactly like `playgrounds/production`
(it shares the same `scripts/pack-devtools-tarballs.mjs` implementation).
Every run wipes and repacks under stable, version-agnostic names, then
installs with `--force`, so the install always reflects the tarballs that
were just packed, never a stale previous build.

`pnpm-workspace.yaml` overrides `@vitejs/devtools`, `@vitejs/devtools-kit`,
and every sibling package to those tarballs. Because `@nuxt/devtools` pulls
those same two packages in as regular (non-`workspace:`) npm dependencies,
the override reaches into Nuxt DevTools' own dependency tree and forces it to
run on the exact Vite DevTools build under test here — not whatever version
`@nuxt/devtools` has pinned on npm. Everything else (`nuxt`, `vue`,
`@nuxt/devtools` itself, ...) resolves from the public registry, just like a
real install.

Its own `pnpm-workspace.yaml` keeps it isolated from the monorepo above, so a
`pnpm install` here builds an independent dependency tree with its own lockfile.

## Usage

From this directory:

```sh
# Build the monorepo, pack the packages, and install them
pnpm run setup

# Start the Nuxt dev server (Nuxt DevTools panel)
pnpm dev

# Or produce a production build
pnpm build
```

To re-pack after changing package source without rebuilding untouched packages,
`pnpm run setup` re-runs the turbo build (cached), repacks, and reinstalls. If
you already have fresh `dist` output and only want to re-pack + reinstall:

```sh
pnpm run setup:no-build
```

## Layout

- `scripts/pack-local.mjs` — build + pack the published packages into `.tarballs/`, then install
- `nuxt.config.ts` — a plain user config with `devtools: { enabled: true }`
- `app/app.vue` — a minimal Nuxt app so the panels have real build/module data
