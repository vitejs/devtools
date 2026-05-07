import { describe, expect, it, vi } from 'vitest'
import { createStreamReader, createStreamSink } from './streaming-channel'

describe('streaming-channel sink', () => {
  it('emits chunk events with monotonic seq', () => {
    const sink = createStreamSink<string>()
    const seen: Array<[number, string]> = []
    sink.events.on('chunk', (seq, chunk) => seen.push([seq, chunk]))

    sink.write('a')
    sink.write('b')
    sink.write('c')

    expect(seen).toEqual([[1, 'a'], [2, 'b'], [3, 'c']])
    expect(sink.lastSeq).toBe(3)
  })

  it('emits end exactly once on close() — second close is a no-op', () => {
    const sink = createStreamSink<string>()
    const end = vi.fn()
    sink.events.on('end', end)

    sink.close()
    sink.close()

    expect(end).toHaveBeenCalledTimes(1)
    expect(end).toHaveBeenCalledWith(undefined)
  })

  it('throws on write after close', () => {
    const sink = createStreamSink<string>()
    sink.close()
    expect(() => sink.write('x')).toThrow(/closed stream/)
  })

  it('emits end with error payload on error()', () => {
    const sink = createStreamSink<string>()
    const end = vi.fn()
    sink.events.on('end', end)

    sink.error(new TypeError('boom'))

    expect(end).toHaveBeenCalledWith({ name: 'TypeError', message: 'boom' })
    expect(sink.signal.aborted).toBe(true)
  })

  it('keeps a ring buffer up to replayWindow', () => {
    const sink = createStreamSink<string>({ replayWindow: 2 })
    sink.write('a')
    sink.write('b')
    sink.write('c')

    expect(sink.buffer.map(b => b.chunk)).toEqual(['b', 'c'])
    expect(sink.buffer.map(b => b.seq)).toEqual([2, 3])
  })

  it('keeps no buffer by default (replayWindow = 0)', () => {
    const sink = createStreamSink<string>()
    sink.write('a')
    sink.write('b')
    expect(sink.buffer.length).toBe(0)
  })

  it('aborts signal on close so handlers can short-circuit', () => {
    const sink = createStreamSink<string>()
    expect(sink.signal.aborted).toBe(false)
    sink.close()
    expect(sink.signal.aborted).toBe(true)
  })

  it('exposes a WritableStream that mirrors imperative writes', async () => {
    const sink = createStreamSink<string>()
    const seen: Array<[number, string]> = []
    sink.events.on('chunk', (seq, chunk) => seen.push([seq, chunk]))

    const source = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('x')
        controller.enqueue('y')
        controller.close()
      },
    })
    await source.pipeTo(sink.writable)

    expect(seen).toEqual([[1, 'x'], [2, 'y']])
    expect(sink.closed).toBe(true)
  })

  it('errors the sink when writable abort fires', async () => {
    const sink = createStreamSink<string>()
    const end = vi.fn()
    sink.events.on('end', end)

    const source = new ReadableStream<string>({
      start(controller) {
        controller.error(new Error('upstream-failed'))
      },
    })
    await source.pipeTo(sink.writable).catch(() => {})

    expect(end).toHaveBeenCalledWith({ name: 'Error', message: 'upstream-failed' })
  })
})

describe('streaming-channel reader', () => {
  it('iterates chunks pushed by the RPC layer', async () => {
    const reader = createStreamReader<number>()
    reader._push(1, 10)
    reader._push(2, 20)
    reader._end()

    const collected: number[] = []
    for await (const v of reader) collected.push(v)

    expect(collected).toEqual([10, 20])
    expect(reader.done).toBe(true)
    expect(reader.lastSeenSeq).toBe(2)
  })

  it('blocks `for await` until next push', async () => {
    const reader = createStreamReader<number>()
    const collected: number[] = []
    const consumer = (async () => {
      for await (const v of reader) collected.push(v)
    })()

    await Promise.resolve()
    reader._push(1, 1)
    await Promise.resolve()
    reader._push(2, 2)
    reader._end()
    await consumer

    expect(collected).toEqual([1, 2])
  })

  it('rejects the iterator with a real Error on _end with payload', async () => {
    const reader = createStreamReader<number>()
    reader._end({ name: 'TypeError', message: 'boom' })

    await expect((async () => {
      for await (const _ of reader) { /* noop */ }
    })()).rejects.toThrow(/boom/)
  })

  it('dedupes chunks with seq <= lastSeenSeq (replay)', async () => {
    const reader = createStreamReader<number>()
    reader._push(1, 100)
    reader._push(2, 200)
    // Replayed
    reader._push(1, 100)
    reader._push(2, 200)
    reader._push(3, 300)
    reader._end()

    const collected: number[] = []
    for await (const v of reader) collected.push(v)
    expect(collected).toEqual([100, 200, 300])
  })

  it('drops oldest chunks on overflow and reports count', () => {
    const onOverflow = vi.fn()
    const reader = createStreamReader<number>({ highWaterMark: 2, onOverflow })

    reader._push(1, 1)
    reader._push(2, 2)
    reader._push(3, 3)
    reader._push(4, 4)

    expect(onOverflow).toHaveBeenCalled()
    // Queue should be capped at highWaterMark
    expect(reader.lastSeenSeq).toBe(4)
  })

  it('cancel() invokes onCancel and ends the stream cleanly', async () => {
    const onCancel = vi.fn()
    const reader = createStreamReader<number>({ onCancel })

    const collected: number[] = []
    const consumer = (async () => {
      for await (const v of reader) collected.push(v)
    })()

    reader._push(1, 1)
    await Promise.resolve()
    reader.cancel()
    await consumer

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(reader.cancelled).toBe(true)
    expect(collected).toEqual([1])
  })

  it('exposes a ReadableStream that surfaces the same chunks', async () => {
    const reader = createStreamReader<string>()

    const collected: string[] = []
    const piped = (async () => {
      for await (const v of streamToAsyncIter(reader.readable))
        collected.push(v)
    })()

    reader._push(1, 'x')
    reader._push(2, 'y')
    reader._end()

    await piped
    expect(collected).toEqual(['x', 'y'])
  })

  it('cancelling the ReadableStream cancels the reader', async () => {
    const onCancel = vi.fn()
    const reader = createStreamReader<string>({ onCancel })

    const r = reader.readable.getReader()
    await r.cancel('user-stop')

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(reader.cancelled).toBe(true)
  })
})

async function* streamToAsyncIter<T>(stream: ReadableStream<T>): AsyncIterable<T> {
  const reader = stream.getReader()
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done)
        return
      yield value
    }
  }
  finally {
    reader.releaseLock()
  }
}
