import type { DevToolsChildProcessExecuteOptions, DevToolsChildProcessTerminalSession, DevToolsNodeContext, DevToolsTerminalHost as DevToolsTerminalHostType, DevToolsTerminalSession, DevToolsTerminalSessionBase, PartialWithoutId, RpcStreamingChannel } from 'devframe/types'
import type { Result as TinyExecResult } from 'tinyexec'
import process from 'node:process'
import { createEventEmitter } from 'devframe/utils/events'
import { logger } from './diagnostics'

/**
 * Channel name used for terminal stream output. Built into devframe so the
 * standalone client (`packages/core/src/client/webcomponents/state/terminals.ts`)
 * can subscribe by a stable, well-known name.
 */
const TERMINAL_STREAM_CHANNEL = 'devtoolskit:internal:terminals' as const
const TERMINAL_REPLAY_WINDOW = 1000

export class DevToolsTerminalHost implements DevToolsTerminalHostType {
  public readonly sessions: DevToolsTerminalHostType['sessions'] = new Map()
  public readonly events: DevToolsTerminalHostType['events'] = createEventEmitter()

  private _boundStreams = new Map<string, {
    dispose: () => void
    stream: ReadableStream
  }>()

  private _channel?: RpcStreamingChannel<string>

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {
  }

  /**
   * Lazily acquire the streaming channel — `context.rpc` isn't assigned
   * until after every host is constructed, so we can't grab it in the
   * constructor.
   */
  private getStreamingChannel(): RpcStreamingChannel<string> | undefined {
    if (this._channel)
      return this._channel
    if (!this.context.rpc?.streaming)
      return undefined
    this._channel = this.context.rpc.streaming.create<string>(
      TERMINAL_STREAM_CHANNEL,
      { replayWindow: TERMINAL_REPLAY_WINDOW },
    )
    return this._channel
  }

  register(session: DevToolsTerminalSession): DevToolsTerminalSession {
    if (this.sessions.has(session.id)) {
      throw logger.DF0004({ id: session.id }).throw()
    }
    this.sessions.set(session.id, session)
    this.bindStream(session)
    this.events.emit('terminal:session:updated', session)
    return session
  }

  update(patch: PartialWithoutId<DevToolsTerminalSession>): void {
    if (!this.sessions.has(patch.id)) {
      throw logger.DF0005({ id: patch.id }).throw()
    }
    const session = this.sessions.get(patch.id)!
    Object.assign(session, patch)
    this.sessions.set(patch.id, session)
    this.bindStream(session)
    this.events.emit('terminal:session:updated', session)
  }

  remove(session: DevToolsTerminalSession): void {
    this._boundStreams.get(session.id)?.dispose()
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
    const sessionBuffer = session.buffer

    const channel = this.getStreamingChannel()
    // The streaming channel reuses `session.id` as the stream id so clients
    // can subscribe immediately after seeing the session in
    // `devtoolskit:internal:terminals:list`.
    const sink = channel?.start({ id: session.id })

    const writer = new WritableStream<string>({
      write(chunk) {
        // Mirror to the legacy session.buffer used by `terminals:read` —
        // unbounded history kept for the snapshot endpoint.
        sessionBuffer.push(chunk)
        sink?.write(chunk)
      },
      close() {
        sink?.close()
      },
      abort(reason) {
        sink?.error(reason)
      },
    })
    session.stream.pipeTo(writer).catch(() => {
      // pipeTo rejection surfaces via writer.abort -> sink.error already.
    })
    this._boundStreams.set(session.id, {
      dispose: () => {
        if (sink && !sink.closed)
          sink.close()
      },
      stream: session.stream,
    })
  }

  async startChildProcess(
    executeOptions: DevToolsChildProcessExecuteOptions,
    terminal: Omit<DevToolsTerminalSessionBase, 'status'>,
  ): Promise<DevToolsChildProcessTerminalSession> {
    if (this.sessions.has(terminal.id)) {
      throw logger.DF0004({ id: terminal.id }).throw()
    }
    const { exec } = await import('tinyexec')

    let controller: ReadableStreamDefaultController<string> | undefined
    const stream = new ReadableStream<string>({
      start(_controller) {
        controller = _controller
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

      ;(async () => {
        for await (const chunk of cp) {
          controller?.enqueue(chunk)
        }
      })()

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
      stream,
      type: 'child-process',
      executeOptions,
      getChildProcess: () => cp?.process,
      terminate,
      restart,
    }
    this.register(session)

    return Promise.resolve(session)
  }
}
