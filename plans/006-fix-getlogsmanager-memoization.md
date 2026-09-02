# Plan 006: Fix `getLogsManager` memoization (missing `weakMap.set`)

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/rolldown/src/node/rpc/utils.ts`
> Compare "Current state" against live code first.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`getLogsManager` is meant to memoize one `RolldownLogsManager` per context via a
`WeakMap`, but it never stores the manager it creates on a cache miss. The misleading
non-null assertion `weakMap.get(context)!` hides the omission. Consequences on every
Rolldown RPC call that reaches this path:
- The `.rolldown` directory is re-detected with `existsSync` each time (wasted work).
- When no directory is found, the `RDDT0001` diagnostic is **re-emitted on every call**
  (console spam), instead of once.
Behavior is otherwise correct only because `RolldownEventsReader` keeps its own
module-level reader cache keyed by filepath — but the manager memoization the code
clearly intends is dead.

## Current state

- `packages/rolldown/src/node/rpc/utils.ts` (full file, 28 lines):
  ```ts
  const weakMap = new WeakMap<ViteDevToolsNodeContext, RolldownLogsManager>()

  export function getLogsManager(context: ViteDevToolsNodeContext): RolldownLogsManager {
    let manager = weakMap.get(context)!
    if (!manager) {
      const dirs = [
        join(context.cwd, 'node_modules', '.rolldown'),
        join(process.cwd(), 'node_modules', '.rolldown'),
      ]
      const dir = dirs.find(dir => existsSync(dir))
      if (!dir) {
        diagnostics.RDDT0001()
      }
      manager = new RolldownLogsManager(dir ?? dirs[0]!)
    }
    return manager
  }

  export function setLogsManager(context: ViteDevToolsNodeContext, manager: RolldownLogsManager) {
    weakMap.set(context, manager)
  }
  ```
- `diagnostics.RDDT0001()` (defined in `packages/rolldown/src/node/diagnostics.ts`) is a
  non-throwing `console.warn` reporter — so today it warns once per call when `.rolldown` is missing.

## Commands you will need

| Purpose    | Command                                        | Expected     |
|------------|------------------------------------------------|--------------|
| Test (one) | `pnpm -C packages/rolldown exec vitest run utils` | tests pass|
| Typecheck  | `pnpm typecheck`                               | exit 0       |
| Lint       | `pnpm lint`                                    | exit 0       |

## Scope

**In scope**:
- `packages/rolldown/src/node/rpc/utils.ts`
- `packages/rolldown/src/node/rpc/__tests__/utils.test.ts` (create)

**Out of scope**:
- `RolldownLogsManager` internals, `setLogsManager` callers, `RolldownEventsReader` cache.

## Git workflow

- Branch: `fix/rolldown-getlogsmanager-memo`.
- Conventional commit, e.g. `fix(rolldown): memoize logs manager per context`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Store the created manager and drop the spurious `!`

Rewrite `getLogsManager` so a cache miss stores the manager:
```ts
export function getLogsManager(context: ViteDevToolsNodeContext): RolldownLogsManager {
  let manager = weakMap.get(context)
  if (!manager) {
    const dirs = [
      join(context.cwd, 'node_modules', '.rolldown'),
      join(process.cwd(), 'node_modules', '.rolldown'),
    ]
    const dir = dirs.find(dir => existsSync(dir))
    if (!dir) {
      diagnostics.RDDT0001()
    }
    manager = new RolldownLogsManager(dir ?? dirs[0]!)
    weakMap.set(context, manager)
  }
  return manager
}
```
The only functional changes: `.get(context)` without `!`, and `weakMap.set(context, manager)` before returning.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Test that repeated calls return the same instance and warn once

Create `packages/rolldown/src/node/rpc/__tests__/utils.test.ts`. Build a fake context
via `{ cwd: someTempDirWithoutRolldown } as unknown as ViteDevToolsNodeContext` (follow
the cast pattern in `packages/core/src/node/__tests__/context-capabilities.test.ts`).
Assert:
- `getLogsManager(ctx) === getLogsManager(ctx)` (same instance — memoized).
- Two different context objects yield two different managers.
- With `.rolldown` absent, the `RDDT0001` warning fires **once** across two calls. Spy on
  it by mocking the diagnostics module (`vi.mock('../../diagnostics', …)`) or by spying
  on `console.warn`; assert the call count is 1, not 2.

**Verify**: `pnpm -C packages/rolldown exec vitest run utils` → all pass.

## Test plan

- New `utils.test.ts` with the three assertions in Step 2. Pattern: `context-capabilities.test.ts` for the fake-context cast; `open-in-editor.test.ts` for `vi.mock`.
- Verification: `pnpm -C packages/rolldown exec vitest run utils` → all pass.

## Done criteria

ALL must hold:
- [ ] `getLogsManager` calls `weakMap.set` on a cache miss; no `!` on the `.get`
- [ ] Test proves same-instance memoization and single `RDDT0001` warning
- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0
- [ ] Only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- `getLogsManager` already stores into the WeakMap (drift — someone fixed it).
- The diagnostics reporter can't be spied cleanly; in that case keep the memoization
  fix + the same-instance assertions and drop the warn-count assertion, noting why.

## Maintenance notes

- Reviewer: confirm `setLogsManager` still works as the explicit override path (tests
  that inject a manager rely on it).
