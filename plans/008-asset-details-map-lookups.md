# Plan 008: Replace quadratic `find`/`filter` in `get-asset-details` with Map lookups

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/rolldown/src/node/rpc/functions/rolldown-get-asset-details.ts`
> Compare "Current state" against live code first.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`rolldown-get-asset-details` resolves an asset's importers and imports with nested
`Array.prototype.filter` + `find` over the full chunk and asset lists. For one asset
this is roughly `O(chunks × imports_per_chunk × assets)` — latency grows quadratically
with build size. The lists are already in hand from `reader.manager.assets` /
`reader.manager.chunks` (both `Map`s), so a one-time `Map<chunk_id, asset>` index turns
the inner `find`s into O(1) lookups with no behavior change.

## Current state

- `packages/rolldown/src/node/rpc/functions/rolldown-get-asset-details.ts` (full handler,
  lines 12-37):
  ```ts
  handler: async ({ session, id }: { session: string, id: string }) => {
    const reader = await manager.loadAssetSession(session)
    const assets = reader.manager.assets   // Map
    const chunks = reader.manager.chunks   // Map
    const asset = assets.get(id)!
    const assetList = Array.from(assets.values())
    const chunkList = Array.from(chunks.values())

    if (asset.chunk_id === null) {
      return { asset }
    }

    const assetChunkId = asset.chunk_id!
    const chunk = chunks.get(assetChunkId)!
    const importers = chunkList.filter(mod => mod.imports.some(i => i.chunk_id === assetChunkId)).map(c => assetList.find(a => a.chunk_id === c.chunk_id)!)
    const imports = chunk.imports.map(c => assetList.find(a => a.chunk_id === c.chunk_id)!)
    return { asset, chunk, importers, imports }
  }
  ```
- `assets`/`chunks` are `Map`s keyed by their own id (`assets.get(id)`, `chunks.get(assetChunkId)`
  already used). Each asset has a `chunk_id` (nullable); each chunk has `imports: { chunk_id }[]`.

## Commands you will need

| Purpose    | Command                                                    | Expected     |
|------------|------------------------------------------------------------|--------------|
| Test (one) | `pnpm -C packages/rolldown exec vitest run asset-details`  | tests pass   |
| Typecheck  | `pnpm typecheck`                                           | exit 0       |
| Lint       | `pnpm lint`                                                | exit 0       |

## Scope

**In scope**:
- `packages/rolldown/src/node/rpc/functions/rolldown-get-asset-details.ts`
- `packages/rolldown/src/node/rpc/functions/__tests__/rolldown-get-asset-details.test.ts` (create — see STOP conditions if the setup proves too heavy)

**Out of scope**:
- The client-side `NodeModuleInfo.vue` linear lookup (separate, lower priority — do not touch here).
- `events-reader`/`logs-manager` internals.

## Git workflow

- Branch: `perf/asset-details-map-lookup`.
- Conventional commit, e.g. `perf(rolldown): index assets by chunk id in get-asset-details`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Build a `Map<chunk_id, asset>` once and use keyed lookups

Replace the two `find`-based lines. Target shape (preserve the exact returned object
shape and ordering semantics):
```ts
const assetList = Array.from(assets.values())
const chunkList = Array.from(chunks.values())

// Index assets by their chunk_id for O(1) resolution.
const assetByChunkId = new Map<string, typeof assetList[number]>()
for (const a of assetList) {
  if (a.chunk_id != null)
    assetByChunkId.set(a.chunk_id, a)
}
// ...
const importers = chunkList
  .filter(mod => mod.imports.some(i => i.chunk_id === assetChunkId))
  .map(c => assetByChunkId.get(c.chunk_id)!)
const imports = chunk.imports.map(c => assetByChunkId.get(c.chunk_id)!)
```
Keep the `asset.chunk_id === null` early return and every other line unchanged. Preserve
the `!` assertions to keep the exact result type (the original used them too).

Note: the outer `chunkList.filter(...).some(...)` remains a scan over chunks; that is
acceptable (one pass), the quadratic factor was the inner `assetList.find` per import.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Add a behavior-equivalence test

Create the test file. Construct a small fake `reader` whose `manager.assets` and
`manager.chunks` are `Map`s with a handful of assets/chunks and known import edges. The
simplest approach: mock `getLogsManager` (or `manager.loadAssetSession`) to return a stub
reader, then call the handler and assert `importers`/`imports` resolve to the expected
assets. Model the mocking on `packages/core/src/node/__tests__/open-in-editor.test.ts`.
Assert:
- An asset with `chunk_id === null` returns `{ asset }` only.
- An asset whose chunk is imported by two other chunks resolves both importers.
- `imports` resolves the chunk's own import edges to their assets.

**Verify**: `pnpm -C packages/rolldown exec vitest run asset-details` → all pass.

## Test plan

- New `rolldown-get-asset-details.test.ts` with the three cases in Step 2.
- Verification: `pnpm -C packages/rolldown exec vitest run asset-details` → all pass.

## Done criteria

ALL must hold:
- [ ] Inner `assetList.find(...)` calls replaced by `assetByChunkId.get(...)`
- [ ] Returned object shape (`asset`, `chunk`, `importers`, `imports`) unchanged
- [ ] New test passes and asserts importer/import resolution
- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0
- [ ] Only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- Two assets share the same non-null `chunk_id` (would make the Map lossy). Inspect the
  data model: if `chunk_id → asset` is not 1:1, keep a `Map<string, asset[]>` or report
  that the assumption is false before proceeding.
- Building a faithful fake reader proves disproportionately heavy — in that case ship the
  Map refactor (it is a mechanical, type-checked, behavior-preserving change) and note in
  the PR that a unit test was deferred because the reader fixture is covered by plan 014.

## Maintenance notes

- If assets ever map many-to-one onto chunks, revisit the index type.
- Reviewer: confirm the result ordering matches the original (the `.filter().map()` order is preserved).
