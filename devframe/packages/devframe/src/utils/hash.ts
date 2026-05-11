import { hash as hashImpl } from 'ohash'

/**
 * Stable, deterministic hash of any structured-cloneable value.
 */
export function hash(value: unknown): string {
  return hashImpl(value)
}
