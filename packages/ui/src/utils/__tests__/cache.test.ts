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

  // -- tests for the fixed `set` routing --

  it('stores object keys in _weakMap', () => {
    const map = new MaybeWeakMap<object, string>()
    const key = { id: 1 }
    map.set(key, 'value')
    expect(Reflect.get(map, '_weakMap').has(key)).toBe(true)
    expect(Reflect.get(map, '_map').has(key)).toBe(false)
    expect(map.get(key)).toBe('value')
  })

  it('stores function keys in _weakMap', () => {
    const map = new MaybeWeakMap<() => void, string>()
    const key = () => {}
    map.set(key, 'value')
    expect(Reflect.get(map, '_weakMap').has(key)).toBe(true)
    expect(Reflect.get(map, '_map').has(key)).toBe(false)
    expect(map.get(key)).toBe('value')
  })

  it('stores local symbol keys in _weakMap', () => {
    const map = new MaybeWeakMap<symbol, string>()
    const key = Symbol('local')
    map.set(key, 'value')
    expect(Reflect.get(map, '_weakMap').has(key)).toBe(true)
    expect(Reflect.get(map, '_map').has(key)).toBe(false)
    expect(map.get(key)).toBe('value')
  })

  it('stores primitive keys in _map', () => {
    const map = new MaybeWeakMap<string | number | boolean | null | undefined, string>()
    map.set('primitive', 'value')
    map.set(42, 'number')
    map.set(true, 'boolean')
    map.set(null, 'null')
    map.set(undefined, 'undefined')
    expect(Reflect.get(map, '_map').get('primitive')).toBe('value')
    expect(Reflect.get(map, '_map').get(42)).toBe('number')
    expect(Reflect.get(map, '_map').get(true)).toBe('boolean')
    expect(Reflect.get(map, '_map').get(null)).toBe('null')
    expect(Reflect.get(map, '_map').get(undefined)).toBe('undefined')
  })

  it('stores global symbol keys in _map', () => {
    const map = new MaybeWeakMap<symbol, string>()
    const key = Symbol.for('global')
    map.set(key, 'value')
    expect(Reflect.get(map, '_map').has(key)).toBe(true)
    expect(Reflect.get(map, '_weakMap').has(key)).toBe(false)
    expect(map.get(key)).toBe('value')
  })

  it('getOrInsert stores object keys in _weakMap', () => {
    const map = new MaybeWeakMap<object, string>()
    const key = { id: 3 }
    const result = map.getOrInsert(key, 'default')
    expect(result).toBe('default')
    expect(Reflect.get(map, '_weakMap').has(key)).toBe(true)
    expect(Reflect.get(map, '_map').has(key)).toBe(false)
  })

  it('getOrInsertComputed stores object keys in _weakMap', () => {
    const map = new MaybeWeakMap<object, number>()
    const key = { id: 2 }
    const result = map.getOrInsertComputed(key, () => 42)
    expect(result).toBe(42)
    expect(Reflect.get(map, '_weakMap').has(key)).toBe(true)
    expect(Reflect.get(map, '_map').has(key)).toBe(false)
  })

  // -- regression tests for get/has/delete with primitive keys --

  it('get should not throw for primitive keys', () => {
    const map = new MaybeWeakMap<any, any>()
    expect(map.get('primitive')).toBe(undefined)
    expect(map.get(42)).toBe(undefined)
    expect(map.get(null)).toBe(undefined)
    expect(map.get(undefined)).toBe(undefined)
    expect(map.get(true)).toBe(undefined)
    expect(map.get(Symbol.for('global'))).toBe(undefined)
  })

  it('has should not throw for primitive keys', () => {
    const map = new MaybeWeakMap<any, any>()
    expect(map.has('primitive')).toBe(false)
    expect(map.has(42)).toBe(false)
    expect(map.has(null)).toBe(false)
    expect(map.has(undefined)).toBe(false)
    expect(map.has(true)).toBe(false)
    expect(map.has(Symbol.for('global'))).toBe(false)
  })

  it('delete should not throw for primitive keys', () => {
    const map = new MaybeWeakMap<any, any>()
    expect(map.delete('primitive')).toBe(false)
    expect(map.delete(42)).toBe(false)
    expect(map.delete(null)).toBe(false)
    expect(map.delete(undefined)).toBe(false)
    expect(map.delete(true)).toBe(false)
    expect(map.delete(Symbol.for('global'))).toBe(false)
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
