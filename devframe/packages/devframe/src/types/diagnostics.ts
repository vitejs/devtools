import type { createLogger, defineDiagnostics, Logger } from 'logs-sdk'

/**
 * A diagnostics definition object built with `defineDiagnostics`. Typed as
 * `unknown` because each integration's definition has a distinct narrow shape
 * (e.g. specific code keys like `DF0001` / `MYP0001`), and TypeScript's mapped
 * types don't allow assigning a narrow-keyed `DiagnosticsResult` to a
 * generically-keyed one. The host stores them in a heterogeneous list and
 * rebuilds the logger on `register()`.
 */
export type DevToolsDiagnosticsDefinition = ReturnType<typeof defineDiagnostics<any>>

/** A `logs-sdk` Logger instance built with `createLogger`. */
export type DevToolsDiagnosticsLogger = Logger<readonly any[]>

/**
 * Host for structured diagnostics — a thin layer over `logs-sdk` that lets
 * integrations register their own coded errors/warnings into the shared
 * logger without taking a direct dependency on `logs-sdk`.
 *
 * Typical usage from a plugin's `setup(ctx)`:
 *
 * ```ts
 * const myDiagnostics = ctx.diagnostics.defineDiagnostics({
 *   docsBase: 'https://example.com/errors',
 *   codes: {
 *     MYP0001: { message: 'Something went wrong' },
 *   },
 * })
 * ctx.diagnostics.register(myDiagnostics)
 *
 * // Later (loose typing):
 * ctx.diagnostics.logger.MYP0001().warn()
 *
 * // Or with full typing, keep your own logger reference:
 * const logger = ctx.diagnostics.createLogger({ diagnostics: [myDiagnostics] })
 * logger.MYP0001().warn()
 * ```
 */
export interface DevToolsDiagnosticsHost {
  /**
   * The combined `logs-sdk` Logger including all registered diagnostic
   * definitions. The getter always returns the freshest logger — it is
   * rebuilt each time `register()` is called, so cached references to
   * older loggers will not see codes registered later.
   */
  readonly logger: DevToolsDiagnosticsLogger

  /**
   * Register an additional diagnostic definition with this host. After
   * registration, codes from the new definition are accessible on
   * `host.logger`. Accepts any `DiagnosticsResult` produced by
   * `defineDiagnostics` — the parameter is typed as `unknown` to avoid
   * mapped-type variance issues with narrowly-keyed definitions.
   */
  register: (definitions: unknown) => void

  /**
   * Re-export of `logs-sdk`'s `defineDiagnostics`. Integrations can build
   * their own diagnostic definitions without taking a direct dependency on
   * `logs-sdk`.
   */
  defineDiagnostics: typeof defineDiagnostics

  /**
   * Re-export of `logs-sdk`'s `createLogger`. Use this when an integration
   * wants its own typed Logger reference instead of going through
   * `host.logger` (which is loosely typed).
   */
  createLogger: typeof createLogger
}
