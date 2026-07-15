# Plan 005: Enforce an Origin allow-list on the WS handshake

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/core/src/node/ws.ts`
> Compare "Current state" against live code before proceeding.
>
> **This plan is investigate-then-implement.** WebSocket origin validation may
> already be handled upstream in devframe's `attachWsRpcTransport`. Step 1 is a
> mandatory investigation gate — if upstream already validates origin, this plan
> becomes a docs/config note, not code.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/003 (characterization tests present around the WS handshake)
- **Category**: security
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

WebSocket upgrades are exempt from the browser same-origin policy. `onConnected`
(`packages/core/src/node/ws.ts:140-160`) reads the `origin` header only to forward it
into the upstream `isRemoteTokenTrusted(authToken, requestOrigin)` call; the connection
itself is accepted regardless of `Origin`, with no in-repo allow-list before a session
is created. Any web page the developer visits while the dev server is up can therefore
open a socket to the DevTools RPC endpoint (cross-site WebSocket hijacking). Alone, an
unauthenticated cross-site peer is confined to `anonymous:` handshake methods, but it
widens the blast radius of every anonymous method and amplifies plan 004's concern.

## Current state

- `packages/core/src/node/ws.ts`:
  - `onConnected(peer, meta)` (lines 140-160): reads
    `const requestOrigin = peer.request?.headers.get('origin') ?? undefined` and passes
    it only to `isRemoteTokenTrusted`. No refusal path based on origin.
  - The transport is attached via `attachWsRpcTransport(rpcGroup, { ...binding, definitions, onConnected, onDisconnected })` (lines 137-176), imported from
    `devframe/rpc/transports/ws-server`.
  - Route-bound mode shares the Vite HTTP server on `DEVTOOLS_WS_PATH`; standalone opens
    a dedicated port. The legitimate server origin is derivable from
    `context.host.resolveOrigin()` (used at line 74).
  - Config lives under `context.viteConfig.devtools?.config` (see `clientAuthTokens`).
- `packages/core/src/node/config.ts` defines the `devtools.config` option shape (read it
  to find where to add a `clientAllowedOrigins` option).

## Commands you will need

| Purpose    | Command                                   | Expected      |
|------------|-------------------------------------------|---------------|
| Test (one) | `pnpm -C packages/core exec vitest run ws`| tests pass    |
| Typecheck  | `pnpm typecheck`                          | exit 0        |
| Lint       | `pnpm lint`                               | exit 0        |

## Scope

**In scope** (pending Step 1 outcome):
- `packages/core/src/node/ws.ts` — origin validation in `onConnected` (or the earliest refusal hook the transport exposes)
- `packages/core/src/node/config.ts` — add a `clientAllowedOrigins?: string[]` config option
- `packages/core/src/node/__tests__/ws-decide-trust.test.ts` or a sibling — test the origin predicate
- `docs/` — a short security note listing the option

**Out of scope**:
- The trust-token logic (plan 004).
- Reimplementing anything upstream `attachWsRpcTransport` already does.

## Git workflow

- Branch: `feat/ws-origin-allowlist`.
- Conventional commit, e.g. `feat(core): validate ws handshake origin`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Investigate whether the transport already validates origin (GATE)

Read the installed `devframe/rpc/transports/ws-server` types/impl (in `node_modules`
after `pnpm install`) and any devframe docs. Determine:
- Does `attachWsRpcTransport` / crossws expose an `upgrade`/`onUpgrade` hook that can
  *refuse* a connection (vs. `onConnected`, which fires after acceptance)?
- Does it already check `Origin`?

If upstream **already** enforces an origin allow-list: STOP the code work and instead
add only the docs/config note (Step 4), recording in `plans/README.md` that the code
change was unnecessary. If it does **not**, continue.

### Step 2: Add a `clientAllowedOrigins` config option

In `config.ts`, extend the devtools config type with
`clientAllowedOrigins?: string[]` and document its default: the Vite server origin
(`context.host.resolveOrigin()`) is always allowed; entries here add extra origins
(e.g. proxied remote-dock hosts).

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Build an origin predicate and refuse disallowed origins

Add a pure helper to `ws.ts`:
```ts
export function isOriginAllowed(origin: string | undefined, allowed: string[]): boolean {
  // No Origin header (native/CLI clients, same-process) is allowed;
  // browsers always send Origin, so a present-but-unlisted origin is refused.
  if (origin == null || origin === '')
    return true
  return allowed.includes(origin)
}
```
Assemble `allowed` from `[context.host.resolveOrigin(), ...(config.clientAllowedOrigins ?? [])]`.
Apply it at the earliest refusal point the transport supports (prefer an upgrade hook
from Step 1; otherwise, in `onConnected`, when the origin is disallowed, close the peer
immediately — e.g. `peer.close?.()` — and do NOT add it to `wsClients` or mark trusted).
Keep the untrusted-but-allowed path (banner) unchanged.

**Verify**: `pnpm typecheck` → exit 0; `pnpm -C packages/core exec vitest run` → existing tests pass.

### Step 4: Test + document

- Unit-test `isOriginAllowed`: undefined/empty allowed; server origin allowed; extra
  configured origin allowed; unknown origin refused.
- Add a short "Configuration & security" note in the docs listing
  `clientAllowedOrigins` alongside `clientAuth`/`clientAuthTokens`.

**Verify**: `pnpm -C packages/core exec vitest run ws` → all pass; `pnpm lint` → exit 0.

## Test plan

- New tests for `isOriginAllowed` (four cases in Step 4), modeled on `ws-decide-trust.test.ts`.
- Verification: `pnpm -C packages/core exec vitest run ws` → all pass.

## Done criteria

ALL must hold (or the Step 1 gate documented that code was unnecessary):
- [ ] Disallowed browser origins are refused before a session becomes usable
- [ ] `clientAllowedOrigins` config option exists and defaults to allowing the server origin
- [ ] `isOriginAllowed` unit-tested
- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0
- [ ] Only in-scope files modified
- [ ] `plans/README.md` status row updated (note the Step 1 outcome)

## STOP conditions

Stop and report if:
- Step 1 shows upstream already enforces origin (do the docs-only path).
- The transport gives no way to refuse a connection without breaking the shared
  Vite-server upgrade path (`destroyUnmatched: false` in route-bound mode) — report the
  constraint rather than risk breaking HMR upgrades.
- Refusing an origin breaks the documented cross-origin remote-dock flow — report and
  propose widening the default allow-list instead.

## Maintenance notes

- The remote-dock feature legitimately dials cross-origin; any allow-list must include
  those origins. Coordinate with `contextInternal.wsEndpoint` / remote-dock docs.
- Reviewer: confirm the no-Origin case stays allowed (native clients) and that HMR
  upgrades on the shared server are untouched.
