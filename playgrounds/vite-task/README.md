# Vite Task playground

Eight simulated packages exercise a monorepo task graph, cache propagation and multi-step plans. Tasks take about 100 ms per step and write real output files without framework dependencies.

From the repository root:

```sh
pnpm install
pnpm build
pnpm --filter playground-vite-task dev
```

Open the DevTools overlay, authorize with the terminal's one-time code, and select **Vite Task** under **Vite+**. Core discovers the installed integration automatically. Switch between **List** and **Graph** to inspect the same tasks.

## Workspace

```text
shared ─┐             ┌─ ui ──┬─ app
        ├─ core ──────┤      └─ docs
types ──┘             └─ cli ─── app
config (independent)
```

`app` depends on both `ui` and `cli`, forming a diamond through `core`. `types` emits only a declaration file. `app` and `docs` emit simulated HTML/JS builds; the root Vite server hosts the playground UI. The CLI build has two `&&` steps.

Each package uses `src/index.ts` as its build input.

Each package has cached `build`, `typecheck` and `test` tasks; the latter two depend on its build. `lint` is an independent package script and `clean` explicitly disables caching. The independent config package's `verify` script runs `preverify` and `postverify` hooks. Hooks use package scripts because `run.tasks` does not automatically execute lifecycle scripts.

The nested `pnpm-workspace.yaml` defines the Vite/Vite Task boundary. Install from the repository root: its workspace glob includes all child packages and its lockfile manages dependencies. The nested catalog mirrors the root for lint/editor resolution; pnpm's nested-settings notice during root installation is expected.

## Cache checks

From `playgrounds/vite-task`, use the local `vp` executable:

```sh
./node_modules/.bin/vp cache clean
./node_modules/.bin/vp run --dry-run --json -vv -r build
./node_modules/.bin/vp run -r build
./node_modules/.bin/vp run -r typecheck
./node_modules/.bin/vp run -r test
./node_modules/.bin/vp run @vite-task-playground/config#verify
```

- Cold builds show **No cached run yet**. After building, **Refresh** shows **Cache hit** for independent inputs. Downstream steps with an undetermined cache result display their commands without a cache label.
- Change `packages/shared/src/index.ts`, then refresh: shared shows **Inputs changed** with the path; downstream predictions stay uncertain until upstream execution. Restore the input afterward.
- Change `inputs/theme.json`: core reads this external `../../inputs/**/*.json` glob. Refresh core's plan to inspect the reason, then restore it.
- Build without `VITE_TASK_MODE`, then restart the dev server with `VITE_TASK_MODE=changed pnpm --filter playground-vite-task dev` from the repository root. The shared task now reports the environment change. Restart without the variable afterward.
- `./node_modules/.bin/vp run -r clean` removes generated outputs. Build again before inspecting test/typecheck results.

The root build orchestrates app, docs and config and has caching disabled. `scripts/task.mjs` is the shared simulation runner; editing it intentionally invalidates all cached tasks that use it.
