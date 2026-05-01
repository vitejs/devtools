import { describe, expect, it, vi } from 'vitest'
import { strictJsonStringify } from './serialization'

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
