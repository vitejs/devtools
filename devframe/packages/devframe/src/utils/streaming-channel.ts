import type { EventEmitter } from 'devframe/types'
import { createEventEmitter } from './events'
import { nanoid } from './nanoid'

/**
 * Serialized error shape sent over the wire when a stream ends with a failure.
 * Stays JSON-safe so the strict-JSON encoder can carry it without coercion.
 */
export interface StreamErrorPayload {
  name: string
  message: string
}

/**
 * Single buffered chunk in the server-side ring buffer.
 *
 * Sequence numbers start at 1 and increment per write. Subscribers track
 * `lastSeenSeq` and ask for `afterSeq` on resubscribe so the server can
 * replay any chunks the client missed during a brief disconnect.
 */
export interface BufferedChunk<T> {
  seq: number
  chunk: T
}

export interface StreamSinkEvents<T> {
  /** Fired for each `write()`. The RPC layer subscribes and broadcasts. */
  chunk: (seq: number, chunk: T) => void
  /** Terminal — fired exactly once per sink lifetime. */
  end: (error?: StreamErrorPayload) => void
}

export interface CreateStreamSinkOptions {
  id?: string
  /**
   * Size of the per-stream ring buffer kept for replay-on-resubscribe.
   * `0` (default) disables replay.
   */
  replayWindow?: number
}

/**
 * Server-side producer handle. Two equivalent surfaces share one piece of
 * state: the imperative `write/error/close` triple, and a `WritableStream<T>`
 * for `pipeTo`-style consumption.
 */
export interface StreamSink<T> {
  /** Stable id used by clients to subscribe. */
  readonly id: string
  /**
   * Aborts when the consumer cancels (server-side) or when the transport
   * loses every subscriber. Producers should poll `signal.aborted` and exit
   * cleanly.
   */
  readonly signal: AbortSignal
  /** `true` after `close()` / `error()`. Further writes throw. */
  readonly closed: boolean
  /** Last allocated sequence number. `0` until the first write. */
  readonly lastSeq: number

  write: (chunk: T) => void
  error: (reason: unknown) => void
  close: () => void
  /** External-cancel path. Aborts the signal so handlers can short-circuit. */
  abort: (reason?: unknown) => void

  /** `WritableStream<T>` adapter — same in-memory state as the imperative API. */
  readonly writable: WritableStream<T>

  /**
   * Internal — RPC layer subscribes to receive chunk/end notifications.
   * Not part of the public contract; do not call directly.
   *
   * @internal
   */
  readonly events: EventEmitter<StreamSinkEvents<T>>

  /**
   * Internal — replay buffer. RPC layer reads on (re)subscribe to feed
   * missed chunks before going live.
   *
   * @internal
   */
  readonly buffer: ReadonlyArray<BufferedChunk<T>>
}

export interface CreateStreamReaderOptions {
  id?: string
  /**
   * Maximum number of buffered chunks held client-side while the consumer
   * isn't draining. On overflow, the oldest chunk is dropped.
   */
  highWaterMark?: number
  /**
   * Called when the chunk queue overflows the high-water mark. The RPC
   * layer wires this to a coded warning; the primitive itself is
   * RPC-agnostic.
   */
  onOverflow?: (dropped: number) => void
  /** Called when the consumer cancels — the RPC layer sends `:cancel` upstream. */
  onCancel?: () => void
}

/**
 * Client-side consumer handle. Both an `AsyncIterable<T>` (for `for await`)
 * and exposes `readable: ReadableStream<T>` (for `pipeTo`). Pick one — they
 * share a single internal queue, so concurrent draining will race.
 */
export interface StreamReader<T> extends AsyncIterable<T> {
  readonly id: string
  readonly cancelled: boolean
  readonly done: boolean
  /** Highest `seq` observed. Used for replay on reconnect. */
  readonly lastSeenSeq: number
  /** `ReadableStream<T>` adapter for `pipeTo`-style consumption. */
  readonly readable: ReadableStream<T>

  cancel: () => void

  /** @internal */
  _push: (seq: number, chunk: T) => void
  /** @internal */
  _end: (error?: StreamErrorPayload) => void
}

const DEFAULT_HIGH_WATER_MARK = 256

class StreamClosedError extends Error {
  override name = 'StreamClosedError'
}

/**
 * Build a server-side stream sink. RPC-agnostic — the RPC host wires
 * `events.on('chunk' | 'end')` to broadcast, and reads `buffer` to replay
 * for late or reconnecting subscribers.
 */
export function createStreamSink<T>(options: CreateStreamSinkOptions = {}): StreamSink<T> {
  const id = options.id ?? nanoid()
  const replayWindow = Math.max(0, options.replayWindow ?? 0)
  const events = createEventEmitter<StreamSinkEvents<T>>()
  const controller = new AbortController()
  const buffer: BufferedChunk<T>[] = []

  let closed = false
  let lastSeq = 0

  function write(chunk: T): void {
    if (closed) {
      throw new StreamClosedError(`Cannot write to a closed stream "${id}"`)
    }
    lastSeq += 1
    if (replayWindow > 0) {
      buffer.push({ seq: lastSeq, chunk })
      if (buffer.length > replayWindow)
        buffer.splice(0, buffer.length - replayWindow)
    }
    events.emit('chunk', lastSeq, chunk)
  }

  function error(reason: unknown): void {
    if (closed)
      return
    closed = true
    const payload = toErrorPayload(reason)
    controller.abort(reason)
    events.emit('end', payload)
  }

  function close(): void {
    if (closed)
      return
    closed = true
    if (!controller.signal.aborted)
      controller.abort('stream closed')
    events.emit('end', undefined)
  }

  function abort(reason?: unknown): void {
    if (closed)
      return
    if (!controller.signal.aborted)
      controller.abort(reason ?? 'aborted')
  }

  const writable = new WritableStream<T>({
    write(chunk) {
      write(chunk)
    },
    close() {
      close()
    },
    abort(reason) {
      error(reason)
    },
  })

  return {
    id,
    signal: controller.signal,
    get closed() { return closed },
    get lastSeq() { return lastSeq },
    write,
    error,
    close,
    abort,
    writable,
    events,
    buffer,
  }
}

/**
 * Build a client-side stream reader. RPC-agnostic — the RPC host calls
 * `_push(seq, chunk)` on each incoming chunk and `_end(error?)` on the
 * terminal frame. Consumers iterate with `for await` or pipe `readable`.
 */
export function createStreamReader<T>(options: CreateStreamReaderOptions = {}): StreamReader<T> {
  const id = options.id ?? nanoid()
  const highWaterMark = Math.max(1, options.highWaterMark ?? DEFAULT_HIGH_WATER_MARK)

  const queue: T[] = []
  let lastSeenSeq = 0
  let done = false
  let cancelled = false
  let endError: StreamErrorPayload | undefined
  let pending: { resolve: (r: IteratorResult<T>) => void, reject: (err: unknown) => void } | undefined
  // Lazily created — accessing `reader.readable` claims the queue for
  // `pipeTo` consumption. While inactive, `_push` only feeds the
  // AsyncIterator path. Mixing the two surfaces is undefined behavior.
  let pullController: ReadableStreamDefaultController<T> | undefined
  let readableInstance: ReadableStream<T> | undefined

  function drainNext(): void {
    if (!pending)
      return
    if (queue.length > 0) {
      const value = queue.shift()!
      const r = pending
      pending = undefined
      r.resolve({ value, done: false })
      return
    }
    if (done) {
      const r = pending
      pending = undefined
      if (endError) {
        const err = new Error(endError.message)
        err.name = endError.name
        r.reject(err)
      }
      else {
        r.resolve({ value: undefined as unknown as T, done: true })
      }
    }
  }

  function feedReadable(): void {
    if (!pullController)
      return
    while (queue.length > 0) {
      const v = queue.shift()!
      try {
        pullController.enqueue(v)
      }
      catch {
        // controller closed/errored under us — drop silently; the
        // ReadableStream consumer is gone and we can't push further.
        break
      }
    }
    if (done && pullController) {
      try {
        if (endError) {
          const err = new Error(endError.message)
          err.name = endError.name
          pullController.error(err)
        }
        else {
          pullController.close()
        }
      }
      catch {
        // already closed
      }
      pullController = undefined
    }
  }

  function push(seq: number, chunk: T): void {
    if (done || cancelled)
      return
    if (seq <= lastSeenSeq)
      return // dedupe replays we've already seen
    lastSeenSeq = seq
    queue.push(chunk)
    if (queue.length > highWaterMark) {
      const overflow = queue.length - highWaterMark
      queue.splice(0, overflow)
      options.onOverflow?.(overflow)
    }
    drainNext()
    if (readableInstance)
      feedReadable()
  }

  function end(error?: StreamErrorPayload): void {
    if (done)
      return
    done = true
    endError = error
    drainNext()
    if (readableInstance)
      feedReadable()
  }

  function cancel(): void {
    if (cancelled || done)
      return
    cancelled = true
    options.onCancel?.()
    end(undefined)
  }

  function getReadable(): ReadableStream<T> {
    if (readableInstance)
      return readableInstance
    readableInstance = new ReadableStream<T>({
      start(controller) {
        pullController = controller
        feedReadable()
      },
      cancel() {
        cancel()
      },
    })
    return readableInstance
  }

  const reader: StreamReader<T> = {
    id,
    get cancelled() { return cancelled },
    get done() { return done },
    get lastSeenSeq() { return lastSeenSeq },
    get readable() { return getReadable() },
    cancel,
    _push: push,
    _end: end,
    [Symbol.asyncIterator](): AsyncIterator<T> {
      return {
        next(): Promise<IteratorResult<T>> {
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false })
          }
          if (done) {
            if (endError) {
              const err = new Error(endError.message)
              err.name = endError.name
              return Promise.reject(err)
            }
            return Promise.resolve({ value: undefined as unknown as T, done: true })
          }
          return new Promise<IteratorResult<T>>((resolve, reject) => {
            pending = { resolve, reject }
          })
        },
        return(): Promise<IteratorResult<T>> {
          cancel()
          return Promise.resolve({ value: undefined as unknown as T, done: true })
        },
      }
    },
  }

  return reader
}

function toErrorPayload(reason: unknown): StreamErrorPayload {
  if (reason instanceof Error) {
    return { name: reason.name || 'Error', message: reason.message }
  }
  if (typeof reason === 'string') {
    return { name: 'Error', message: reason }
  }
  try {
    return { name: 'Error', message: JSON.stringify(reason) }
  }
  catch {
    return { name: 'Error', message: String(reason) }
  }
}
