import { consoleReporter, createLogger, defineDiagnostics, plainFormatter } from 'logs-sdk'

// `DF` codes own the framework-neutral devframe surface (RPC, dump,
// agent contract). The prior generation of these codes used the `DTK`
// prefix and lived under the @vitejs/devtools docs site; they have
// been migrated to `DF` here so all devframe-package codes share one
// numbering space and one docsBase.
export const diagnostics = defineDiagnostics({
  docsBase: 'https://devfra.me/errors',
  codes: {
    DF0019: {
      message: (p: { name: string }) =>
        `RPC function "${p.name}" has \`agent\` set but \`jsonSerializable\` is not \`true\` — MCP requires JSON-serializable data.`,
      hint: 'Set `jsonSerializable: true` if the payload is JSON-safe, or remove `agent` to keep it RPC-only.',
    },
    DF0020: {
      message: (p: { name: string, type: string, path: string }) =>
        `RPC function "${p.name}" declares \`jsonSerializable: true\` but the value at "${p.path}" is a ${p.type}.`,
      hint: 'Either drop `jsonSerializable: true` (falls back to structured-clone) or change the value to a JSON-safe shape.',
    },
    // Migrated from DTK0001
    DF0021: {
      message: (p: { name: string }) => `RPC function "${p.name}" is already registered`,
      hint: 'Use the `force` parameter to overwrite an existing registration.',
    },
    // Migrated from DTK0002
    DF0022: {
      message: (p: { name: string }) => `RPC function "${p.name}" is not registered. Use register() to add new functions.`,
    },
    // Migrated from DTK0003
    DF0023: {
      message: (p: { name: string }) => `RPC function "${p.name}" is not registered`,
    },
    // Migrated from DTK0004
    DF0024: {
      message: (p: { name: string }) => `Either handler or setup function must be provided for RPC function "${p.name}"`,
    },
    // Migrated from DTK0005
    DF0025: {
      message: (p: { name: string }) => `Function "${p.name}" not found in dump store`,
    },
    // Migrated from DTK0006
    DF0026: {
      message: (p: { name: string, args: string }) => `No dump match for "${p.name}" with args: ${p.args}`,
    },
    // Migrated from DTK0007
    DF0027: {
      message: (p: { name: string, type: string }) => `Function "${p.name}" with type "${p.type}" cannot have dump configuration. Only "static" and "query" types support dumps.`,
    },
    // Migrated from DTK0008
    DF0028: {
      message: (p: { name: string, type: string }) => `Function "${p.name}" with type "${p.type}" cannot use \`snapshot: true\`. Only "query" functions support this sugar; "static" functions have equivalent default behavior already.`,
      hint: 'Remove `snapshot: true`, or change the function type to `query`.',
    },
  },
})

export const logger = createLogger({
  diagnostics: [diagnostics],
  formatter: plainFormatter,
  reporters: consoleReporter,
})
