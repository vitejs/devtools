import { describe, expect, it } from 'vitest'
import { FixedTupleMap, MaybeWeakMap, TupleMap } from '../cache'

describe('maybeWeakMap', () => {
  it('should work', () => {
    const map = new MaybeWeakMap<any, any>()
    map.set('a', 'b')
    expect(map.get('a')).toBe('b')
    expect(map.get(1)).toBe(undefined)
  })

  it('should work with weak keys', () => {
    const map = new MaybeWeakMap<any, any>()
    const symbol = Symbol('a')
    map.set(symbol, 'b')
    expect(map.get(symbol)).toBe('b')
  })

  it('should work with object keys', () => {
    const map = new MaybeWeakMap<any, any>()
    const obj = {}
    map.set(obj, 'b')
    expect(map.get(obj)).toBe('b')
  })
})

describe('tupleMap', () => {
  it('should work', () => {
    const map = new TupleMap<any, any>()
    map.set(['a', 'b'], 'c')
    expect(map.get(['a', 'b'])).toBe('c')
    expect(map.get(['a'])).toBe(undefined)
    expect(map.get(['a', 'c'])).toBe(undefined)
    expect(map.get(['a', 'b', 'c'])).toBe(undefined)
  })

  it('should work with weak keys', () => {
    const map = new TupleMap<any, any>()
    const symbol = Symbol('a')
    map.set([symbol, 'b'], 'c')
    expect(map.get([symbol, 'b'])).toBe('c')
    expect(map.get([symbol])).toBe(undefined)
    expect(map.get([symbol, 'c'])).toBe(undefined)
    expect(map.get([symbol, 'b', 'c'])).toBe(undefined)
    map.set([symbol, 'b'], 'override')
    expect(map.get([symbol, 'b'])).toBe('override')
    map.delete([symbol, 'b'])
    expect(map.get([symbol, 'b'])).toBe(undefined)
  })
})

describe('fixedTupleMap', () => {
  it('error on wrong key length', () => {
    const map = new FixedTupleMap(5)
    expect(() => map.set([1, 2, 3], 'a'))
      .toThrowErrorMatchingInlineSnapshot(`[Error: Expect tuple of length 5, got 3]`)
  })

  it('iterator', () => {
    const map = new FixedTupleMap(5)
    const symbol = Symbol('a')
    map.set([symbol, 'b', 'c', 'd', 'e'], 'f')
    map.set([symbol, 'g', 'h', 'i', 'j'], 'k')
    map.set([symbol, 'l', 'm', 'n', 'o'], 'p')
    map.set([symbol, 'q', 'r', 's', 't'], 'u')
    map.set([symbol, 'v', 'w', 'x', 'y'], 'z')
    map.set([symbol, 'a', 'b', 'c', 'd'], 'e')
    map.set([symbol, 'f', 'g', 'h', 'i'], 'j')
    map.set([symbol, 'k', 'l', 'm', 'n'], 'o')
    map.set([symbol, 'p', 'q', 'r', 's'], 't')
    map.set([symbol, 'u', 'v', 'w', 'x'], 'y')
    map.set([symbol, 'z', 'a', 'b', 'c'], 'd')

    const keys = Array.from(map._traverseMap())
    expect(keys)
      .toMatchInlineSnapshot(`
      [
        {
          "keys": [
            Symbol(a),
            "b",
            "c",
            "d",
            "e",
          ],
          "map": "f",
        },
        {
          "keys": [
            Symbol(a),
            "g",
            "h",
            "i",
            "j",
          ],
          "map": "k",
        },
        {
          "keys": [
            Symbol(a),
            "l",
            "m",
            "n",
            "o",
          ],
          "map": "p",
        },
        {
          "keys": [
            Symbol(a),
            "q",
            "r",
            "s",
            "t",
          ],
          "map": "u",
        },
        {
          "keys": [
            Symbol(a),
            "v",
            "w",
            "x",
            "y",
          ],
          "map": "z",
        },
        {
          "keys": [
            Symbol(a),
            "a",
            "b",
            "c",
            "d",
          ],
          "map": "e",
        },
        {
          "keys": [
            Symbol(a),
            "f",
            "g",
            "h",
            "i",
          ],
          "map": "j",
        },
        {
          "keys": [
            Symbol(a),
            "k",
            "l",
            "m",
            "n",
          ],
          "map": "o",
        },
        {
          "keys": [
            Symbol(a),
            "p",
            "q",
            "r",
            "s",
          ],
          "map": "t",
        },
        {
          "keys": [
            Symbol(a),
            "u",
            "v",
            "w",
            "x",
          ],
          "map": "y",
        },
        {
          "keys": [
            Symbol(a),
            "z",
            "a",
            "b",
            "c",
          ],
          "map": "d",
        },
      ]
    `)
  })
})
