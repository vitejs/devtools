import type { EventEmitter } from 'devframe/types'
import type { Objectish, Patch } from 'immer'
import { applyPatches, enablePatches as enableImmerPatches, produce, produceWithPatches } from 'immer'
import { createEventEmitter } from './events'
import { nanoid } from './nanoid'

// eslint-disable-next-line ts/no-unsafe-function-type
type ImmutablePrimitive = undefined | null | boolean | string | number | Function

export type Immutable<T>
  = T extends ImmutablePrimitive ? T
    : T extends Array<infer U> ? ImmutableArray<U>
      : T extends Map<infer K, infer V> ? ImmutableMap<K, V>
        : T extends Set<infer M> ? ImmutableSet<M> : ImmutableObject<T>

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>>
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> }

/**
 * Serializable patch describing a single mutation to a `SharedState`.
 * Structurally compatible with JSON-Patch and is safe to send over RPC.
 */
export interface SharedStatePatch {
  op: 'add' | 'remove' | 'replace'
  path: readonly (string | number)[]
  value?: unknown
}

/**
 * State host that is immutable by default with explicit mutate.
 */
export interface SharedState<T> {
  /**
   * Get the current state. Immutable.
   */
  value: () => Immutable<T>
  /**
   * Subscribe to state changes.
   */
  on: EventEmitter<SharedStateEvents<T>>['on']
  /**
   * Mutate the state.
   */
  mutate: (fn: (state: T) => void, syncId?: string) => void
  /**
   * Apply patches to the state.
   */
  patch: (patches: SharedStatePatch[], syncId?: string) => void
  /**
   * Sync IDs that have been applied to the state.
   */
  syncIds: Set<string>
}

export interface SharedStateEvents<T> {
  updated: (fullState: T, patches: SharedStatePatch[] | undefined, syncId: string) => void
}

export interface SharedStateOptions<T> {
  /**
   * Initial state.
   */
  initialValue: T
  /**
   * Enable patches.
   *
   * @default false
   */
  enablePatches?: boolean
}

export function createSharedState<T extends object>(
  options: SharedStateOptions<T>,
): SharedState<T> {
  const {
    enablePatches = false,
  } = options

  const events = createEventEmitter<SharedStateEvents<T>>()
  let state = options.initialValue
  const syncIds = new Set<string>()

  return {
    on: events.on,
    value: () => state as Immutable<T>,
    patch: (patches: SharedStatePatch[], syncId = nanoid()) => {
      // Avoid loop syncs
      if (syncIds.has(syncId))
        return
      enableImmerPatches()
      state = applyPatches(state as unknown as Objectish, patches as unknown as Patch[]) as T
      syncIds.add(syncId)
      events.emit('updated', state, undefined, syncId)
    },
    mutate: (fn, syncId = nanoid()) => {
      // Avoid loop syncs
      if (syncIds.has(syncId))
        return

      syncIds.add(syncId)
      if (enablePatches) {
        const [newState, patches] = produceWithPatches(
          state as unknown as Objectish,
          fn as (draft: any) => void,
        ) as unknown as [T, Patch[]]
        state = newState
        events.emit('updated', state, patches as unknown as SharedStatePatch[], syncId)
      }
      else {
        state = produce(state as unknown as Objectish, fn as (draft: any) => void) as T
        events.emit('updated', state, undefined, syncId)
      }
    },
    syncIds,
  }
}
