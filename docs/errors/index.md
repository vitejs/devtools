---
outline: deep
---

# Error Reference

Vite DevTools uses structured diagnostics to surface actionable warnings and errors at runtime. Each diagnostic has a unique error code, a human-readable message, and a link back to this documentation.

## How error codes work

- Codes follow the pattern **prefix + 4-digit number** (e.g., `DF0001`, `DTK0008`, `RDDT0002`).
- Each prefix maps to a package: `DTK` for `@vitejs/devtools` (Vite-specific pieces), `RDDT` for `@vitejs/devtools-rolldown`, `VDT` for `@vitejs/devtools-vite`, `VTDT` for `@vitejs/devtools-vitest`. The framework-neutral `devframe` package documents its own `DF`-prefixed codes at the [Devframe docs site](https://devfra.me/errors/).
- Every error page includes the cause, recommended fix, and a reference to the source file that emits it.
- The diagnostics system is powered by [`nostics`](https://github.com/vercel-labs/nostics), which provides structured diagnostic codes with docs URLs and ANSI-formatted console output.

## DevTools Kit (DTK)

Emitted by `@vitejs/devtools` and `@vitejs/devtools-kit`.

| Code | Level | Title |
|------|-------|-------|
| [DTK0008](./DTK0008) | warn | Client Auth Disabled |
| [DTK0010](./DTK0010) | warn | Experimental Static Build |
| [DTK0011](./DTK0011) | error | RPC Function Error |
| [DTK0012](./DTK0012) | error | RPC General Error |
| [DTK0013](./DTK0013) | error | Unauthorized RPC Access |
| [DTK0014](./DTK0014) | error | Plugin Setup Error |
| [DTK0023](./DTK0023) | error | Vite Server Required |
| [DTK0028](./DTK0028) | error | Path Outside Workspace Root |
| [DTK0029](./DTK0029) | error | Path Outside Workspace Root |
| [DTK0030](./DTK0030) | error | Dock Entry Not Found |
| [DTK0031](./DTK0031) | error | Dock Entry Not a Launcher |
| [DTK0032](./DTK0032) | error | Dock Launch Error |
| [DTK0050](./DTK0050) | error | Integration Install Failed |
| [DTK0051](./DTK0051) | warn | Connection Meta Serve Failed |
| [DTK0052](./DTK0052) | error | Launcher Process Exited Before Ready |

Hub-side diagnostics for docks, terminals, messages, and commands live upstream in `@devframes/hub` under the `DF8xxx` range — see the [Devframe error reference](https://devfra.me/errors/).

## Rolldown DevTools (RDDT)

Emitted by `@vitejs/devtools-rolldown`.

| Code | Level | Title |
|------|-------|-------|
| [RDDT0001](./RDDT0001) | warn | Rolldown Logs Directory Not Found |
| [RDDT0002](./RDDT0002) | warn | Rolldown Log Reader Bad Line |

## Vite DevTools (VDT)

Emitted by `@vitejs/devtools-vite`.

| Code | Level | Title |
|------|-------|-------|
| [VDT0001](./VDT0001) | error | Inspect Context Unavailable |
| [VDT0002](./VDT0002) | error | Inspect Target Not Found |
| [VDT0003](./VDT0003) | error | Inspect Storage Error |

## Vitest DevTools (VTDT)

Emitted by `@vitejs/devtools-vitest`.

| Code | Level | Title |
|------|-------|-------|
| [VTDT0001](./VTDT0001) | error | Vitest UI Install Failed |
| [VTDT0002](./VTDT0002) | error | Vitest UI Server Unreachable |

## Oxc DevTools (OXDT)

Emitted by `@vitejs/devtools-oxc`.

| Code | Level | Title |
|------|-------|-------|
| [OXDT0001](./OXDT0001) | error | Failed to Create Lint Result |
| [OXDT0002](./OXDT0002) | error | Invalid Lint Result ID |
| [OXDT0003](./OXDT0003) | error | Failed to Delete Lint Result |
