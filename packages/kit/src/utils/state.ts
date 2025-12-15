import type { Objectish, Patch } from 'immer'
import type { EventEmitter } from '../types/events'
import { applyPatches, produce, produceWithPatches } from 'immer'
import { createEventEmitter } from './events'

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
 * State host that is immutable by default with explicit mutate.
 */
export interface SharedState<T> {
  /**
   * Get the current state. Immutable.
   */
  get: () => Immutable<T>
  /**
   * Subscribe to state changes.
   */
  on: EventEmitter<SharedStateEvents<T>>['on']
  /**
   * Mutate the state.
   */
  mutate: (fn: (state: T) => void) => void
  /**
   * Apply patches to the state.
   */
  patch: (patches: Patch[]) => void
}

export interface SharedStateEvents<T> {
  updated: (state: T) => void
  patches: (patches: Patch[]) => void
}

export interface SharedStateOptions<T> {
  /**
   * Initial state.
   */
  initialState: T
  /**
   * Enable patches.
   *
   * @default false
   */
  enablePatches?: boolean
}

export function createSharedState<T extends Objectish>(
  options: SharedStateOptions<T>,
): SharedState<T> {
  const {
    enablePatches = false,
  } = options

  const events = createEventEmitter<SharedStateEvents<T>>()
  let state = options.initialState

  return {
    on: events.on,
    get: () => state as Immutable<T>,
    patch: (patches: Patch[]) => {
      state = applyPatches<T>(state, patches)
      events.emit('updated', state)
    },
    mutate: (fn) => {
      if (enablePatches) {
        const [newState, patches] = produceWithPatches(state, fn)
        state = newState
        events.emit('patches', patches)
      }
      else {
        state = produce(state, fn)
      }
      events.emit('updated', state)
    },
  }
}
