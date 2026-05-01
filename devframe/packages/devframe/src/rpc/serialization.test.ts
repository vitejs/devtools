import { describe, expect, it, vi } from 'vitest'
import {
  makePerCallChannelOptions,
  strictJsonStringify,
  STRUCTURED_CLONE_PREFIX,
} from './serialization'

describe('strictJsonStringify', () => {
  it('matches JSON.stringify for plain JSON values', () => {
    const value = { a: 1, b: 'two', c: [true, null, 3.14] }
    expect(strictJsonStringify(value)).toBe(JSON.stringify(value))
  })

  it('rejects Map', () => {
    expect(() => strictJsonStringify({ a: new Map([['k', 1]]) }, 'fn'))
      .toThrowError(/jsonSerializable: true.*is a Map/)
  })

  it('rejects Set', () => {
    expect(() => strictJsonStringify({ a: new Set([1, 2]) }, 'fn'))
      .toThrowError(/is a Set/)
  })

  it('rejects Date', () => {
    expect(() => strictJsonStringify({ when: new Date() }, 'fn'))
      .toThrowError(/is a Date/)
  })

  it('rejects BigInt', () => {
    expect(() => strictJsonStringify({ n: 1n }, 'fn'))
      .toThrowError(/is a BigInt/)
  })

  it('rejects class instances', () => {
    class Thing {
      x = 1
    }
    expect(() => strictJsonStringify({ t: new Thing() }, 'fn'))
      .toThrowError(/is a Thing/)
  })

  it('rejects undefined inside an array (lossy → null in JSON)', () => {
    expect(() => strictJsonStringify({ items: [1, undefined, 3] }, 'fn'))
      .toThrowError(/is a undefined/)
  })

  it('allows undefined as an object property (legitimate optional field)', () => {
    expect(strictJsonStringify({ a: 1, missing: undefined })).toBe('{"a":1}')
  })

  it('allows undefined at the root (action returning nothing)', () => {
    expect(strictJsonStringify(undefined)).toBe(undefined as any)
  })

  it('rejects circular references via the native TypeError', () => {
    const obj: any = { a: 1 }
    obj.self = obj
    expect(() => strictJsonStringify(obj, 'fn'))
      .toThrowError(/circular|Converting circular/i)
  })

  it('mentions the function name in the diagnostic', () => {
    expect(() => strictJsonStringify({ a: new Map() }, 'plugin:my-fn'))
      .toThrowError(/plugin:my-fn/)
  })

  it('walks each node only once (single pass)', () => {
    const replacerCalls: string[] = []
    const orig = JSON.stringify
    const spy = vi.spyOn(JSON, 'stringify').mockImplementation((value, replacer) => {
      const wrappedReplacer
        = typeof replacer === 'function'
          ? function (this: unknown, key: string, val: unknown) {
            replacerCalls.push(key)
            return (replacer as (k: string, v: unknown) => unknown).call(this, key, val)
          }
          : replacer
      return orig(value, wrappedReplacer as any)
    })
    try {
      strictJsonStringify({ a: 1, b: { c: [2, 3] } })
    }
    finally {
      spy.mockRestore()
    }
    // 1 root + a + b + c + [0] + [1] = 6 nodes
    expect(replacerCalls).toEqual(['', 'a', 'b', 'c', '0', '1'])
  })
})

describe('makePerCallChannelOptions', () => {
  function makeChannel(jsonMethods: string[]) {
    const defs = new Map(
      jsonMethods.map(name => [name, { jsonSerializable: true as const }]),
    )
    return makePerCallChannelOptions(defs)
  }

  it('encodes JSON-flagged requests without a prefix', () => {
    const ch = makeChannel(['fn'])
    const wire = ch.serialize!({ t: 'q', i: '1', m: 'fn', a: [1, 2] })
    expect(wire).toBe('{"t":"q","i":"1","m":"fn","a":[1,2]}')
    expect(wire.startsWith('s:')).toBe(false)
  })

  it('encodes structured-clone requests with the s: prefix', () => {
    const ch = makeChannel([])
    const wire = ch.serialize!({ t: 'q', i: '1', m: 'fn', a: [new Map([['k', 1]])] })
    expect(typeof wire).toBe('string')
    expect((wire as string).startsWith(STRUCTURED_CLONE_PREFIX)).toBe(true)
  })

  it('decodes per the wire prefix without consulting defs', () => {
    const ch = makeChannel([]) // no defs at all on this channel
    // JSON-encoded request — no prefix.
    const json = ch.deserialize!('{"t":"q","i":"1","m":"fn","a":[1]}')
    expect(json).toEqual({ t: 'q', i: '1', m: 'fn', a: [1] })

    // SC-encoded message: produce a real SC wire string from a sender
    // that doesn't know `fn` (so it falls through to SC), then route
    // that string through this channel's deserialize. Map round-trips.
    const sender = makeChannel([])
    const wire = sender.serialize!({ t: 'q', i: '2', m: 'fn', a: [new Map([['k', 1]])] }) as string
    expect(wire.startsWith(STRUCTURED_CLONE_PREFIX)).toBe(true)
    const decoded = ch.deserialize!(wire) as { t: 'q', a: [Map<string, number>] }
    expect(decoded.a[0]).toBeInstanceOf(Map)
    expect(decoded.a[0].get('k')).toBe(1)
  })

  it('mirrors the originating method to dispatch the response encoding', () => {
    const ch = makeChannel(['fn'])
    // Receive a request → record method
    ch.deserialize!('{"t":"q","i":"abc","m":"fn","a":[]}')
    // Send the response → uses JSON because fn is jsonSerializable: true
    const wire = ch.serialize!({ t: 's', i: 'abc', r: { ok: 1 } }) as string
    expect(wire.startsWith(STRUCTURED_CLONE_PREFIX)).toBe(false)
    expect(JSON.parse(wire)).toEqual({ t: 's', i: 'abc', r: { ok: 1 } })
  })

  it('falls back to structured-clone for unknown methods', () => {
    const ch = makeChannel(['known'])
    const wire = ch.serialize!({ t: 'q', i: '1', m: 'unknown', a: [] }) as string
    expect(wire.startsWith(STRUCTURED_CLONE_PREFIX)).toBe(true)
  })

  it('throws DF0019 when a JSON-flagged request carries non-JSON args', () => {
    const ch = makeChannel(['fn'])
    expect(() =>
      ch.serialize!({ t: 'q', i: '1', m: 'fn', a: [new Map()] }),
    ).toThrowError(/jsonSerializable: true/)
  })
})
