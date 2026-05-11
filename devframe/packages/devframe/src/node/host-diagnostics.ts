import type { DevToolsDiagnosticsHost as DevToolsDiagnosticsHostType, DevToolsDiagnosticsLogger, DevToolsNodeContext } from 'devframe/types'
import { consoleReporter, createLogger, defineDiagnostics } from 'logs-sdk'
import { ansiFormatter } from 'logs-sdk/formatters/ansi'
import { colors as c } from '../utils/colors'

export class DevToolsDiagnosticsHost implements DevToolsDiagnosticsHostType {
  private _definitions: unknown[] = []
  private _logger!: DevToolsDiagnosticsLogger

  readonly defineDiagnostics: typeof defineDiagnostics = defineDiagnostics
  readonly createLogger: typeof createLogger = createLogger

  constructor(
    public readonly context: DevToolsNodeContext,
    initialDefinitions: unknown[] = [],
  ) {
    this._definitions = [...initialDefinitions]
    this._rebuild()
  }

  get logger(): DevToolsDiagnosticsLogger {
    return this._logger
  }

  register(definitions: unknown): void {
    this._definitions.push(definitions)
    this._rebuild()
  }

  private _rebuild(): void {
    this._logger = createLogger({
      diagnostics: this._definitions as any[],
      formatter: ansiFormatter(c),
      reporters: consoleReporter,
    }) as DevToolsDiagnosticsLogger
  }
}
