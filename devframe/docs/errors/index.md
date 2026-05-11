---
outline: deep
---

# Error Reference

Devframe uses structured diagnostics to surface actionable warnings and errors at runtime. Each diagnostic has a unique error code, a human-readable message, and a link back to this documentation.

## How error codes work

- Codes follow the pattern **`DF` + 4-digit number** (e.g., `DF0001`).
- Every error page includes the cause, recommended fix, and a reference to the source file that emits it.
- The diagnostics system is powered by [`logs-sdk`](https://github.com/vercel-labs/logs-sdk), which provides structured logging with docs URLs, ANSI-formatted console output, and level-based filtering.

## Devframe (DF)

Emitted by `devframe` — framework-neutral host / shared-state / auth surface.

| Code | Level | Title |
|------|-------|-------|
| [DF0006](./DF0006) | error | RPC Function Not Registered |
| [DF0007](./DF0007) | error | AsyncLocalStorage Not Set |
| [DF0008](./DF0008) | error | View distDir Not Found |
| [DF0012](./DF0012) | warn | Storage Parse Failed |
| [DF0013](./DF0013) | error | Shared State Not Found |
| [DF0014](./DF0014) | error | Invalid Agent Field |
| [DF0015](./DF0015) | error | Agent Tool Already Registered |
| [DF0016](./DF0016) | error | Agent Resource Already Registered |
| [DF0017](./DF0017) | error | MCP Server Start Failure |
| [DF0019](./DF0019) | error | Agent Requires JSON-Serializable RPC |
| [DF0020](./DF0020) | error | Non-JSON Value in JSON-Serializable RPC |
| [DF0021](./DF0021) | error | RPC Function Already Registered |
| [DF0022](./DF0022) | error | RPC Function Not Registered (Update) |
| [DF0023](./DF0023) | error | RPC Function Not Registered (Get) |
| [DF0024](./DF0024) | error | Missing RPC Handler |
| [DF0025](./DF0025) | error | Function Not in Dump Store |
| [DF0026](./DF0026) | error | No Dump Match |
| [DF0027](./DF0027) | error | Invalid Dump Configuration |
| [DF0028](./DF0028) | error | Snapshot Type Mismatch |
| [DF0029](./DF0029) | warn | Stream Buffer Overflow |
| [DF0030](./DF0030) | error | Unknown Stream ID |
| [DF0031](./DF0031) | error | Write to Closed Stream |
| [DF0032](./DF0032) | error | Streaming Channel Already Registered |
| [DF0033](./DF0033) | warn | Dev RPC Bridge Failed to Start |
