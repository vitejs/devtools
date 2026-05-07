import type { StreamErrorPayload, StreamReader, StreamSink } from 'devframe/utils/streaming-channel'
import type { DevToolsRpcClient } from './rpc'
import { createStreamReader, createStreamSink } from 'devframe/utils/streaming-channel'

const STREAM_KEY_SEPARATOR = '\x1F'

function streamKey(channel: string, id: string): string {
  return `${channel}${STREAM_KEY_SEPARATOR}${id}`
}

export interface StreamingSubscribeOptions {
  /** Maximum buffered chunks before the oldest is dropped. Default 256. */
  highWaterMark?: number
}

export interface RpcStreamingClientHost {
  /**
   * Subscribe to a server-side stream by channel + id. Returns a reader
   * that's both an `AsyncIterable<T>` (`for await`) and exposes
   * `readable: ReadableStream<T>` for `pipeTo`-style consumption.
   */
  subscribe: <T = unknown>(
    channel: string,
    id: string,
    options?: StreamingSubscribeOptions,
  ) => StreamReader<T>
  /**
   * Open the client side of a client-to-server upload. The id is
   * typically obtained from a prior action call that ran
   * `channel.openInbound()` on the server. Returns a `StreamSink<T>`
   * that mirrors the server-side producer surface (write / close /
   * error / writable / signal).
   *
   * The sink's `signal` aborts when the server cancels the upload.
   */
  upload: <T = unknown>(channel: string, id: string) => StreamSink<T>
}

/**
 * Client-side streaming host. Mirrors `createRpcSharedStateClientHost`:
 * registers the two `:chunk` / `:end` event handlers once, then per-stream
 * state lives in a `Map<streamKey, StreamReader>`.
 */
export function createRpcStreamingClientHost(rpc: DevToolsRpcClient): RpcStreamingClientHost {
  const readers = new Map<string, StreamReader<any>>()
  const uploads = new Map<string, StreamSink<any>>()

  rpc.client.register({
    name: 'devframe:streaming:chunk',
    type: 'event',
    handler(channel: string, id: string, seq: number, chunk: any) {
      const reader = readers.get(streamKey(channel, id))
      reader?._push(seq, chunk)
    },
  })

  rpc.client.register({
    name: 'devframe:streaming:end',
    type: 'event',
    handler(channel: string, id: string, error?: StreamErrorPayload) {
      const key = streamKey(channel, id)
      const reader = readers.get(key)
      if (!reader)
        return
      reader._end(error)
      readers.delete(key)
    },
  })

  rpc.client.register({
    name: 'devframe:streaming:upload-cancel',
    type: 'event',
    handler(channel: string, id: string) {
      const key = streamKey(channel, id)
      const sink = uploads.get(key)
      if (!sink)
        return
      // Server told us to stop — flip the sink's signal so producers
      // observing it can short-circuit. We don't error() here so the
      // local closer-of-record decides terminal state.
      sink.abort('server cancelled upload')
      uploads.delete(key)
    },
  })

  // Re-subscribe on reconnect — the server may have rebooted (lost state)
  // OR the WS dropped briefly (state intact). Either way, sending `subscribe`
  // with `afterSeq: lastSeenSeq` is the right thing: the server replays
  // missed chunks if it has them, otherwise starts fresh.
  rpc.events.on('rpc:is-trusted:updated', (isTrusted) => {
    if (!isTrusted)
      return
    for (const [key, reader] of readers) {
      if (reader.cancelled || reader.done)
        continue
      const sepIdx = key.indexOf(STREAM_KEY_SEPARATOR)
      if (sepIdx < 0)
        continue
      const channel = key.slice(0, sepIdx)
      const id = key.slice(sepIdx + 1)
      rpc.callEvent(
        'devframe:streaming:subscribe',
        channel,
        id,
        { afterSeq: reader.lastSeenSeq },
      )
    }
  })

  function subscribe<T>(
    channel: string,
    id: string,
    options: StreamingSubscribeOptions = {},
  ): StreamReader<T> {
    const key = streamKey(channel, id)
    const existing = readers.get(key)
    if (existing)
      return existing as StreamReader<T>

    const reader = createStreamReader<T>({
      id,
      highWaterMark: options.highWaterMark,
      onOverflow(dropped) {
        console.warn(
          `[devframe] DF0029: Stream "${channel}#${id}" dropped ${dropped} chunk(s) `
          + `after exceeding the client high-water mark.`,
        )
      },
      onCancel() {
        rpc.callEvent('devframe:streaming:cancel', channel, id)
        readers.delete(key)
      },
    })

    readers.set(key, reader)

    // Subscribe immediately if already trusted; otherwise wait for trust.
    // Mirrors `client/rpc-shared-state.ts` behavior.
    if (rpc.isTrusted) {
      rpc.callEvent('devframe:streaming:subscribe', channel, id, {
        afterSeq: 0,
      })
    }
    else {
      const off = rpc.events.on('rpc:is-trusted:updated', (trusted) => {
        if (trusted) {
          off()
          if (readers.has(key) && !reader.cancelled && !reader.done) {
            rpc.callEvent('devframe:streaming:subscribe', channel, id, {
              afterSeq: reader.lastSeenSeq,
            })
          }
        }
      })
    }

    return reader
  }

  function upload<T>(channel: string, id: string): StreamSink<T> {
    const key = streamKey(channel, id)
    const existing = uploads.get(key)
    if (existing)
      return existing as StreamSink<T>

    const sink = createStreamSink<T>({ id })

    sink.events.on('chunk', (seq, chunk) => {
      rpc.callEvent(
        'devframe:streaming:upload-chunk',
        channel,
        id,
        seq,
        chunk,
      )
    })
    sink.events.on('end', (error) => {
      rpc.callEvent(
        'devframe:streaming:upload-end',
        channel,
        id,
        error,
      )
      uploads.delete(key)
    })

    uploads.set(key, sink)
    return sink
  }

  return { subscribe, upload }
}
