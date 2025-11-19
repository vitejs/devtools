import type { DevToolsChildProcessTerminalOptions, DevToolsChildProcessTerminalSession, DevToolsNodeContext, DevToolsTerminalHost as DevToolsTerminalHostType, DevToolsTerminalSession, DevToolsTerminalSessionSerializable } from '@vitejs/devtools-kit'
import type { Result as TinyExecResult } from 'tinyexec'
import process from 'node:process'

export class DevToolsTerminalHost implements DevToolsTerminalHostType {
  constructor(
    public readonly context: DevToolsNodeContext,
  ) {
  }

  readonly sessions: Map<string, DevToolsTerminalSession> = new Map()

  serialize(session: DevToolsTerminalSession): DevToolsTerminalSessionSerializable {
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      status: session.status,
      buffer: session.buffer ?? [],
    }
  }

  register(session: DevToolsTerminalSession): DevToolsTerminalSession {
    if (this.sessions.has(session.id)) {
      throw new Error(`Terminal session with id "${session.id}" already registered`)
    }
    this.sessions.set(session.id, session)
    return session
  }

  update(session: DevToolsTerminalSession): void {
    if (!this.sessions.has(session.id)) {
      throw new Error(`Terminal session with id "${session.id}" not registered`)
    }
    this.sessions.set(session.id, session)
  }

  async startChildProcess(options: DevToolsChildProcessTerminalOptions): Promise<DevToolsChildProcessTerminalSession> {
    if (this.sessions.has(options.id)) {
      throw new Error(`Terminal session with id "${options.id}" already registered`)
    }
    const { exec } = await import('tinyexec')

    let controller: ReadableStreamDefaultController<string> | undefined
    const buffer = new ReadableStream<string>({
      async start(_controller) {
        controller = _controller
      },
    })
    const writer = new WritableStream<string>({
      write(chunk) {
        controller?.enqueue(chunk)
      },
    })

    function createChildProcess() {
      const cp = exec(
        options.command,
        options.args || [],
        {
          nodeOptions: {
            env: {
              COLORS: 'true',
              FORCE_COLOR: 'true',
              ...(options.env || {}),
            },
            cwd: options.cwd ?? process.cwd(),
            stdio: 'pipe',
          },
        },
      )

      const stream = new ReadableStream<string>({
        async start(controller) {
          for await (const chunk of cp) {
            controller.enqueue(chunk)
          }
        },
      })
      stream.pipeTo(writer)
      return cp
    }

    let cp: TinyExecResult | undefined = createChildProcess()

    const restart = async () => {
      cp?.kill()
      cp = createChildProcess()
    }
    const terminate = async () => {
      cp?.kill()
      cp = undefined
    }

    const session: DevToolsChildProcessTerminalSession = {
      ...options,
      status: 'running',
      stream: buffer,
      getChildProcess: () => cp?.process,
      terminate,
      restart,
    }
    this.sessions.set(session.id, session)

    return Promise.resolve(session)
  }
}
