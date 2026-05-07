---
outline: deep
---

# Error Reference

DevFrame uses structured diagnostics to surface actionable warnings and errors at runtime. Each diagnostic has a unique error code, a human-readable message, and a link back to this documentation.

## How error codes work

- Codes follow the pattern **`DF` + 4-digit number** (e.g., `DF0001`).
- Every error page includes the cause, recommended fix, and a reference to the source file that emits it.
- The diagnostics system is powered by [`logs-sdk`](https://github.com/vercel-labs/logs-sdk), which provides structured logging with docs URLs, ANSI-formatted console output, and level-based filtering.

## Devframe (DF)

Emitted by `devframe` — framework-neutral host / shared-state / auth surface.

| Code | Level | Title | Migrated from |
|------|-------|-------|---------------|
| [DF0001](./DF0001) | error | Dock Already Registered | DTK0015 |
| [DF0002](./DF0002) | error | Cannot Change Dock ID | DTK0016 |
| [DF0003](./DF0003) | error | Dock Not Registered | DTK0017 |
| [DF0004](./DF0004) | error | Terminal Session Already Registered | DTK0018 |
| [DF0005](./DF0005) | error | Terminal Session Not Registered | DTK0019 |
| [DF0006](./DF0006) | error | RPC Function Not Registered | DTK0020 |
| [DF0007](./DF0007) | error | AsyncLocalStorage Not Set | DTK0021 |
| [DF0008](./DF0008) | error | View distDir Not Found | DTK0022 |
| [DF0009](./DF0009) | error | Command Already Registered | DTK0024 |
| [DF0010](./DF0010) | error | Cannot Change Command ID | DTK0025 |
| [DF0011](./DF0011) | error | Command Not Registered | DTK0026 |
| [DF0012](./DF0012) | warn | Storage Parse Failed | DTK0009 |
| [DF0013](./DF0013) | error | Shared State Not Found | DTK0027 |
| [DF0014](./DF0014) | error | Invalid Agent Field | — |
| [DF0015](./DF0015) | error | Agent Tool Already Registered | — |
| [DF0016](./DF0016) | error | Agent Resource Already Registered | — |
| [DF0017](./DF0017) | error | MCP Server Start Failure | — |
| [DF0018](./DF0018) | warn | `ctx.logs` Deprecated | — |
| [DF0019](./DF0019) | error | Agent Requires JSON-Serializable RPC | — |
| [DF0020](./DF0020) | error | Non-JSON Value in JSON-Serializable RPC | — |
| [DF0021](./DF0021) | error | RPC Function Already Registered | DTK0001 |
| [DF0022](./DF0022) | error | RPC Function Not Registered (Update) | DTK0002 |
| [DF0023](./DF0023) | error | RPC Function Not Registered (Get) | DTK0003 |
| [DF0024](./DF0024) | error | Missing RPC Handler | DTK0004 |
| [DF0025](./DF0025) | error | Function Not in Dump Store | DTK0005 |
| [DF0026](./DF0026) | error | No Dump Match | DTK0006 |
| [DF0027](./DF0027) | error | Invalid Dump Configuration | DTK0007 |
| [DF0028](./DF0028) | error | Snapshot Type Mismatch | DTK0008 |
| [DF0029](./DF0029) | warn | Stream Buffer Overflow | — |
| [DF0030](./DF0030) | error | Unknown Stream ID | — |
| [DF0031](./DF0031) | error | Write to Closed Stream | — |
| [DF0032](./DF0032) | error | Streaming Channel Already Registered | — |
| [DF0033](./DF0033) | error | Generator with Agent Exposure | — |
| [DF0034](./DF0034) | error | Generator Handler Not Async-Iterable | — |
| [DF0035](./DF0035) | error | Generator Missing Yields Schema | — |
| [DF0036](./DF0036) | error | Generator Has Inapplicable Option | — |
