import type { DevToolsChildProcessExecuteOptions, DevToolsChildProcessTerminalSession, DevToolsNodeContext, DevToolsTerminalHost as DevToolsTerminalHostType, DevToolsTerminalSession, DevToolsTerminalSessionBase, PartialWithoutId } from '@vitejs/devtools-kit'
import type { Result as TinyExecResult } from 'tinyexec'
import process from 'node:process'
import { createEventEmitter } from '@vitejs/devtools-kit/utils/events'

export class DevToolsTerminalHost implements DevToolsTerminalHostType {
  public readonly sessions: DevToolsTerminalHostType['sessions'] = new Map()
  public readonly events: DevToolsTerminalHostType['events'] = createEventEmitter()

  private _boundStreams = new Map<string, {
    dispose: () => void
    stream: ReadableStream
  }>()

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {
  }

  register(session: DevToolsTerminalSession): DevToolsTerminalSession {
    if (this.sessions.has(session.id)) {
      throw new Error(`Terminal session with id "${session.id}" already registered`)
    }
    this.sessions.set(session.id, session)
    this.bindStream(session)
    this.events.emit('terminal:session:updated', session)
    return session
  }

  update(patch: PartialWithoutId<DevToolsTerminalSession>): void {
    if (!this.sessions.has(patch.id)) {
      throw new Error(`Terminal session with id "${patch.id}" not registered`)
    }
    const session = this.sessions.get(patch.id)!
    Object.assign(session, patch)
    this.sessions.set(patch.id, session)
    this.bindStream(session)
    this.events.emit('terminal:session:updated', session)
  }

  remove(session: DevToolsTerminalSession): void {
    this.sessions.delete(session.id)
    this.events.emit('terminal:session:updated', session)
    this._boundStreams.delete(session.id)
  }

  private bindStream(session: DevToolsTerminalSession) {
    // Skip when the same stream is already bound
    if (this._boundStreams.has(session.id) && this._boundStreams.get(session.id)?.stream === session.stream)
      return

    // Dispose the previous stream
    this._boundStreams.get(session.id)?.dispose()
    this._boundStreams.delete(session.id)

    // If new stream is not available, skip
    if (!session.stream)
      return

    session.buffer ||= []
    const events = this.events
    const writer = new WritableStream<string>({
      write(chunk) {
        session.buffer!.push(chunk)
        events.emit('terminal:session:stream-chunk', {
          id: session.id,
          chunks: [chunk],
          ts: Date.now(),
        })
      },
    })
    session.stream.pipeTo(writer)
    this._boundStreams.set(session.id, {
      dispose: () => {
        writer.close()
      },
      stream: session.stream,
    })
  }

  async startChildProcess(
    executeOptions: DevToolsChildProcessExecuteOptions,
    terminal: DevToolsTerminalSessionBase,
  ): Promise<DevToolsChildProcessTerminalSession> {
    if (this.sessions.has(terminal.id)) {
      throw new Error(`Terminal session with id "${terminal.id}" already registered`)
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
        executeOptions.command,
        executeOptions.args || [],
        {
          nodeOptions: {
            env: {
              COLORS: 'true',
              FORCE_COLOR: 'true',
              ...(executeOptions.env || {}),
            },
            cwd: executeOptions.cwd ?? process.cwd(),
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
      ...terminal,
      status: 'running',
      stream: buffer,
      type: 'child-process',
      executeOptions,
      getChildProcess: () => cp?.process,
      terminate,
      restart,
    }
    this.sessions.set(session.id, session)

    return Promise.resolve(session)
  }
}
