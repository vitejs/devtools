import type {
  DevToolsNodeRpcSessionMeta,
  RpcFunctionsHost,
  RpcStreamingChannel,
  RpcStreamingChannelOptions,
  RpcStreamingHost,
} from 'devframe/types'
import type { StreamErrorPayload, StreamReader, StreamSink } from 'devframe/utils/streaming-channel'
import { createStreamReader, createStreamSink } from 'devframe/utils/streaming-channel'
import { createDebug } from 'obug'
import { logger } from './diagnostics'

const debug = createDebug('vite:devtools:rpc:streaming')

const STREAM_KEY_SEPARATOR = '\x1F'

function streamKey(channel: string, id: string): string {
  return `${channel}${STREAM_KEY_SEPARATOR}${id}`
}

interface ServerStreamRecord<T = any> {
  sink: StreamSink<T>
  subscribers: Set<DevToolsNodeRpcSessionMeta>
  unbinders: (() => void)[]
  /** Timer scheduled when stream closes with no subscribers; cleared on resubscribe. */
  retentionTimer?: ReturnType<typeof setTimeout>
}

interface ServerInboundRecord<T = any> {
  reader: StreamReader<T>
  /** First session that wrote to this inbound — locks ownership for cleanup. */
  uploaderMeta?: DevToolsNodeRpcSessionMeta
}

interface ChannelState<T = any> {
  name: string
  options: Required<RpcStreamingChannelOptions>
  streams: Map<string, ServerStreamRecord<T>>
  inbound: Map<string, ServerInboundRecord<T>>
}

/**
 * Build the server-side streaming host. Mirrors the layout of
 * `createRpcSharedStateServerHost` — registers a fixed set of internal
 * RPC methods (`subscribe` / `unsubscribe` / `cancel`) once, then per-channel
 * state lives in a `Map<channelName, ChannelState>`.
 */
export function createRpcStreamingServerHost(rpc: RpcFunctionsHost): RpcStreamingHost {
  const channels = new Map<string, ChannelState>()

  function findStream(channelName: string, id: string): ServerStreamRecord | undefined {
    return channels.get(channelName)?.streams.get(id)
  }

  function freeStreamNow(state: ChannelState, id: string): void {
    const record = state.streams.get(id)
    if (!record)
      return
    if (record.retentionTimer) {
      clearTimeout(record.retentionTimer)
      record.retentionTimer = undefined
    }
    for (const off of record.unbinders) off()
    state.streams.delete(id)
    debug('freed', state.name, id)
  }

  function maybeFreeStream(state: ChannelState, id: string): void {
    const record = state.streams.get(id)
    if (!record)
      return
    if (!record.sink.closed || record.subscribers.size > 0)
      return

    // Closed and no subscribers — either free now or hold for replay.
    const retention = state.options.closedStreamRetention
    if (retention <= 0) {
      freeStreamNow(state, id)
      return
    }
    // Schedule free unless a subscriber resurrects the stream first.
    if (record.retentionTimer)
      return // already scheduled
    record.retentionTimer = setTimeout(freeStreamNow, retention, state, id)
  }

  function cancelRetention(record: ServerStreamRecord): void {
    if (record.retentionTimer) {
      clearTimeout(record.retentionTimer)
      record.retentionTimer = undefined
    }
  }

  rpc.register({
    name: 'devframe:streaming:subscribe',
    type: 'event',
    handler(channelName: string, id: string, opts?: { afterSeq?: number }) {
      const state = channels.get(channelName)
      if (!state) {
        logger.DF0030({ channel: channelName, id }).log()
        return
      }
      const record = state.streams.get(id)
      if (!record) {
        logger.DF0030({ channel: channelName, id }).log()
        return
      }
      const session = rpc.getCurrentRpcSession()
      if (!session)
        return
      const key = streamKey(channelName, id)
      session.meta.subscribedStreams ??= new Set()
      session.meta.subscribedStreams.add(key)
      record.subscribers.add(session.meta)
      cancelRetention(record)

      const afterSeq = opts?.afterSeq ?? 0
      for (const buffered of record.sink.buffer) {
        if (buffered.seq > afterSeq) {
          rpc.broadcast({
            method: 'devframe:streaming:chunk',
            args: [channelName, id, buffered.seq, buffered.chunk],
            event: true,
            optional: true,
            filter: client => client.$meta === session.meta,
          })
        }
      }
      if (record.sink.closed) {
        rpc.broadcast({
          method: 'devframe:streaming:end',
          args: [channelName, id, undefined],
          event: true,
          optional: true,
          filter: client => client.$meta === session.meta,
        })
      }
    },
  })

  rpc.register({
    name: 'devframe:streaming:unsubscribe',
    type: 'event',
    handler(channelName: string, id: string) {
      const state = channels.get(channelName)
      const record = state?.streams.get(id)
      const session = rpc.getCurrentRpcSession()
      if (!session)
        return
      session.meta.subscribedStreams?.delete(streamKey(channelName, id))
      if (state && record) {
        record.subscribers.delete(session.meta)
        maybeFreeStream(state, id)
      }
    },
  })

  rpc.register({
    name: 'devframe:streaming:cancel',
    type: 'event',
    handler(channelName: string, id: string) {
      const record = findStream(channelName, id)
      if (!record)
        return
      // Cooperative cancel — only abort if the cancelling session was the
      // last subscriber. Otherwise other clients still want the stream.
      const session = rpc.getCurrentRpcSession()
      if (!session)
        return
      record.subscribers.delete(session.meta)
      session.meta.subscribedStreams?.delete(streamKey(channelName, id))
      if (record.subscribers.size === 0)
        record.sink.abort('cancelled by client')
    },
  })

  rpc.register({
    name: 'devframe:streaming:upload-chunk',
    type: 'event',
    handler(channelName: string, id: string, seq: number, chunk: any) {
      const state = channels.get(channelName)
      const record = state?.inbound.get(id)
      if (!record) {
        logger.DF0030({ channel: channelName, id }).log()
        return
      }
      // Lock the inbound to the first session that writes; subsequent
      // chunks from a different session are ignored. The action handler
      // returned the id to one specific caller, so this is the
      // expected ownership model.
      if (!record.uploaderMeta) {
        const session = rpc.getCurrentRpcSession()
        if (session) {
          record.uploaderMeta = session.meta
          session.meta.uploadingStreams ??= new Set()
          session.meta.uploadingStreams.add(streamKey(channelName, id))
        }
      }
      record.reader._push(seq, chunk)
    },
  })

  rpc.register({
    name: 'devframe:streaming:upload-end',
    type: 'event',
    handler(channelName: string, id: string, error?: StreamErrorPayload) {
      const state = channels.get(channelName)
      const record = state?.inbound.get(id)
      if (!record)
        return
      record.reader._end(error)
      if (record.uploaderMeta) {
        record.uploaderMeta.uploadingStreams?.delete(streamKey(channelName, id))
      }
      state?.inbound.delete(id)
    },
  })

  function createChannel<T>(name: string, opts: RpcStreamingChannelOptions = {}): RpcStreamingChannel<T> {
    if (channels.has(name))
      throw logger.DF0032({ channel: name }).throw()

    const replayWindow = opts.replayWindow ?? 0
    const state: ChannelState<T> = {
      name,
      options: {
        replayWindow,
        // Default to a 30-second hold when replay is enabled so late
        // subscribers can join after the producer finishes.
        closedStreamRetention: opts.closedStreamRetention ?? (replayWindow > 0 ? 30_000 : 0),
      },
      streams: new Map(),
      inbound: new Map(),
    }
    channels.set(name, state)

    function start(startOpts: { id?: string } = {}): StreamSink<T> {
      const sink = createStreamSink<T>({
        id: startOpts.id,
        replayWindow: state.options.replayWindow,
      })

      const record: ServerStreamRecord<T> = {
        sink,
        subscribers: new Set(),
        unbinders: [],
      }
      state.streams.set(sink.id, record)

      record.unbinders.push(
        sink.events.on('chunk', (seq, chunk) => {
          rpc.broadcast({
            method: 'devframe:streaming:chunk',
            args: [name, sink.id, seq, chunk],
            event: true,
            optional: true,
            filter: client => record.subscribers.has(client.$meta as DevToolsNodeRpcSessionMeta),
          })
        }),
      )
      record.unbinders.push(
        sink.events.on('end', (error) => {
          rpc.broadcast({
            method: 'devframe:streaming:end',
            args: [name, sink.id, error],
            event: true,
            optional: true,
            filter: client => record.subscribers.has(client.$meta as DevToolsNodeRpcSessionMeta),
          })
          maybeFreeStream(state, sink.id)
        }),
      )

      return sink
    }

    async function pipeFrom(readable: ReadableStream<T>, startOpts: { id?: string } = {}): Promise<StreamSink<T>> {
      const sink = start(startOpts)
      readable.pipeTo(sink.writable, { signal: sink.signal }).catch(() => {
        // Errors flow through the writable's `abort` → `sink.error`.
        // The pipeTo rejection is informational only.
      })
      return sink
    }

    function get(id: string): StreamSink<T> | undefined {
      return state.streams.get(id)?.sink
    }

    function ids(): string[] {
      return Array.from(state.streams.keys())
    }

    function openInbound(inboundOpts: { id?: string } = {}): StreamReader<T> {
      // Forward-declared so `onCancel` can read the uploader meta that's
      // assigned later (when the first chunk arrives).
      let inboundRecord: ServerInboundRecord<T>
      const reader = createStreamReader<T>({
        id: inboundOpts.id,
        onCancel() {
          // Server-initiated cancel — tell the uploading client to stop.
          // The cancel is targeted at the session that owns this inbound.
          const targetMeta = inboundRecord?.uploaderMeta
          if (!targetMeta)
            return
          rpc.broadcast({
            method: 'devframe:streaming:upload-cancel',
            args: [name, reader.id],
            event: true,
            optional: true,
            filter: client => client.$meta === targetMeta,
          })
        },
      })

      inboundRecord = { reader }
      state.inbound.set(reader.id, inboundRecord)
      debug('opened-inbound', name, reader.id)

      return reader
    }

    return { name, start, pipeFrom, get, ids, openInbound }
  }

  function parseKey(key: string): { channelName: string, id: string } | undefined {
    const sepIdx = key.indexOf(STREAM_KEY_SEPARATOR)
    if (sepIdx < 0)
      return undefined
    return { channelName: key.slice(0, sepIdx), id: key.slice(sepIdx + 1) }
  }

  return {
    create: createChannel,
    _onSessionDisconnected(meta: DevToolsNodeRpcSessionMeta) {
      // Outbound: drop subscriber, abort if last one drops.
      if (meta.subscribedStreams) {
        for (const key of meta.subscribedStreams) {
          const parsed = parseKey(key)
          if (!parsed)
            continue
          const state = channels.get(parsed.channelName)
          const record = state?.streams.get(parsed.id)
          if (!state || !record)
            continue
          record.subscribers.delete(meta)
          if (record.subscribers.size === 0 && !record.sink.closed) {
            // Last subscriber gone — abort so the producer can short-circuit.
            record.sink.abort('all subscribers disconnected')
          }
          maybeFreeStream(state, parsed.id)
        }
        meta.subscribedStreams.clear()
      }

      // Inbound: end the reader with an error so the consuming handler
      // exits cleanly. Each inbound is owned by one session so we just
      // free it.
      if (meta.uploadingStreams) {
        for (const key of meta.uploadingStreams) {
          const parsed = parseKey(key)
          if (!parsed)
            continue
          const state = channels.get(parsed.channelName)
          const record = state?.inbound.get(parsed.id)
          if (!state || !record)
            continue
          record.reader._end({
            name: 'UploadDisconnected',
            message: 'Uploader disconnected before completing the stream',
          })
          state.inbound.delete(parsed.id)
        }
        meta.uploadingStreams.clear()
      }
    },
  }
}
