import type { ChildProcess } from 'node:child_process'

export interface DevToolsTerminalHost {
  readonly sessions: Map<string, DevToolsTerminalSession>

  register: (session: DevToolsTerminalSession) => DevToolsTerminalSession
  update: (session: DevToolsTerminalSession) => void

  serialize: (session: DevToolsTerminalSession) => DevToolsTerminalSessionSerializable

  startChildProcess: (options: DevToolsChildProcessTerminalOptions) => Promise<DevToolsChildProcessTerminalSession>
}

export type DevToolsTerminalStatus = 'running' | 'stopped' | 'error'

export interface DevToolsTerminalSessionBase {
  id: string
  title: string
  description?: string
}

export interface DevToolsTerminalSessionSerializable extends DevToolsTerminalSessionBase {
  status: DevToolsTerminalStatus
  buffer?: string[]
}

export interface DevToolsTerminalSession extends DevToolsTerminalSessionSerializable {
  stream?: ReadableStream<string>
}

export interface DevToolsChildProcessTerminalOptions extends DevToolsTerminalSessionBase {
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
}

export interface DevToolsChildProcessTerminalSession extends DevToolsTerminalSession {
  getChildProcess: () => ChildProcess | undefined
  terminate: () => Promise<void>
  restart: () => Promise<void>
}
