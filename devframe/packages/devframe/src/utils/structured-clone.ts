import {
  deserialize as deserializeImpl,
  parse as parseImpl,
  serialize as serializeImpl,
  stringify as stringifyImpl,
} from 'structured-clone-es'

/**
 * Serialize a structured-cloneable value (`Map`, `Set`, `Date`, `BigInt`,
 * cycles, class instances, …) into a JSON-safe records array.
 */
export function structuredCloneSerialize(value: unknown): unknown[] {
  return serializeImpl(value)
}

/**
 * Inverse of {@link structuredCloneSerialize}.
 */
export function structuredCloneDeserialize<T = unknown>(value: unknown[]): T {
  return deserializeImpl(value) as T
}

/**
 * Serialize a structured-cloneable value to a single string. Equivalent
 * to `JSON.stringify(structuredCloneSerialize(value))`.
 */
export function structuredCloneStringify(value: unknown): string {
  return stringifyImpl(value)
}

/**
 * Inverse of {@link structuredCloneStringify}.
 */
export function structuredCloneParse<T = unknown>(value: string): T {
  return parseImpl<T>(value)
}
