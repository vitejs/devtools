import type { ChildProcess } from 'node:child_process'
import type { EventEmitter } from './events'

export interface DevToolsTerminalSessionStreamChunkEvent {
  id: string
  chunks: string[]
  ts: number
}

export interface DevToolsTerminalHost {
  readonly sessions: Map<string, DevToolsTerminalSession>
  readonly events: EventEmitter<{
    'terminal:session:updated': (session: DevToolsTerminalSession) => void
    'terminal:session:stream-chunk': (data: DevToolsTerminalSessionStreamChunkEvent) => void
  }>

  register: (session: DevToolsTerminalSession) => DevToolsTerminalSession
  update: (session: DevToolsTerminalSession) => void

  startChildProcess: (
    executeOptions: DevToolsChildProcessExecuteOptions,
    terminal: Omit<DevToolsTerminalSessionBase, 'status'>,
  ) => Promise<DevToolsChildProcessTerminalSession>
}

export type DevToolsTerminalStatus = 'running' | 'stopped' | 'error'

export interface DevToolsTerminalSessionBase {
  id: string
  title: string
  description?: string
  status: DevToolsTerminalStatus
}

export interface DevToolsTerminalSession extends DevToolsTerminalSessionBase {
  buffer?: string[]
  stream?: ReadableStream<string>
}

export interface DevToolsChildProcessExecuteOptions {
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
}

export interface DevToolsChildProcessTerminalSession extends DevToolsTerminalSession {
  type: 'child-process'
  executeOptions: DevToolsChildProcessExecuteOptions
  getChildProcess: () => ChildProcess | undefined
  terminate: () => Promise<void>
  restart: () => Promise<void>
}
