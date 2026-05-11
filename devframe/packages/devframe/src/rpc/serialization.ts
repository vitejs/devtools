import { logger } from './diagnostics'

/**
 * Wire format used by the WS RPC transport.
 *
 * - **JSON (default, unprefixed):** payload is plain JSON text. Used when
 *   the dispatched method is declared `jsonSerializable: true`. Encoded
 *   via {@link strictJsonStringify} (rejects non-JSON values), decoded
 *   via `JSON.parse`.
 * - **Structured-clone (`s:` prefix):** payload is `s:` followed by
 *   `structured-clone-es` text. Used when the method is declared
 *   `jsonSerializable: false` (or omitted, the default). Round-trips
 *   `Map`, `Set`, `Date`, `BigInt`, cycles, and class instances.
 *
 * birpc envelopes always start with `{`, so a leading byte that is not
 * `s` is unambiguously JSON. Each direction independently chooses its
 * encoding from local definitions — request and response are not
 * coupled by a mirror rule.
 */
export const STRUCTURED_CLONE_PREFIX = 's:'

/**
 * `JSON.stringify` with a single-pass strict replacer.
 *
 * Throws `DF0020` synchronously when the value contains a type JSON
 * cannot round-trip losslessly: `Map`, `Set`, `Date`, `BigInt`, class
 * instances, or `undefined` inside an array (silently becomes `null`).
 *
 * Native pass-throughs (no extra work needed):
 *   - circular references — `JSON.stringify` raises `TypeError`.
 *   - `BigInt` at top level — caught here for a friendlier error path.
 *
 * Lenient cases (allowed without throwing):
 *   - `undefined` as an object property — legitimate optional field;
 *     JSON.stringify just omits it.
 *   - `undefined` at the root — legitimate "action returned nothing".
 *   - `Symbol` / `Function` values — semantically "drop me" in JSON.
 *
 * `fnName` is used only for the diagnostic message — pass the RPC
 * function name when calling from a wire serializer / dump writer so
 * the error points at the offending function.
 */
export function strictJsonStringify(value: unknown, fnName: string = ''): string {
  return JSON.stringify(value, function strictReplacer(this: unknown, key: string, val: unknown): unknown {
    // The replacer receives the value AFTER any `toJSON()` coercion
    // (e.g. `Date` already became an ISO string). To detect raw types,
    // peek at the holder's original property via `this[key]`. At the
    // root, `this` is the wrapper `{ '': value }` so `this['']` is the
    // raw root value.
    const holder = this as Record<string, unknown> | unknown[] | undefined
    const original = holder != null ? (holder as any)[key] : val

    if (original === undefined) {
      if (Array.isArray(holder))
        throw nonJsonAt(fnName, 'undefined', holder, key)
      return val
    }
    if (original === null)
      return val

    if (typeof original === 'bigint')
      throw nonJsonAt(fnName, 'BigInt', holder, key)

    if (typeof original === 'object') {
      if (original instanceof Map)
        throw nonJsonAt(fnName, 'Map', holder, key)
      if (original instanceof Set)
        throw nonJsonAt(fnName, 'Set', holder, key)
      if (original instanceof Date)
        throw nonJsonAt(fnName, 'Date', holder, key)
      if (Array.isArray(original))
        return val
      const proto = Object.getPrototypeOf(original)
      if (proto !== null && proto !== Object.prototype) {
        const ctorName = (original as { constructor?: { name?: string } }).constructor?.name
          ?? 'class instance'
        throw nonJsonAt(fnName, ctorName, holder, key)
      }
    }

    return val
  })
}

function nonJsonAt(fnName: string, type: string, parent: unknown, key: string): Error {
  const path = formatPath(parent, key)
  return logger.DF0020({ name: fnName || '<anonymous>', type, path }).throw()
}

function formatPath(parent: unknown, key: string): string {
  if (Array.isArray(parent))
    return `[${key}]`
  if (key === '')
    return '<root>'
  return key
}
