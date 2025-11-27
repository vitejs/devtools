import type { EventEmitter, EventsMap, EventUnsubscribe } from '../types/events'

/**
 * Create event emitter.
 */
export function createEventEmitter<
  Events extends EventsMap,
>(): EventEmitter<Events> {
  const _listeners: Partial<{ [E in keyof Events]: Events[E][] }> = {}

  return {
    emit<K extends keyof Events>(
      this: EventEmitter<Events>,
      event: K,
      ...args: Parameters<Events[K]>
    ) {
      const callbacks = _listeners[event] || []
      for (let i = 0, length = callbacks.length; i < length; i++) {
        const callback = callbacks[i]
        if (callback)
          callback(...args)
      }
    },
    _listeners,
    on<K extends keyof Events>(
      this: EventEmitter<Events>,
      event: K,
      cb: Events[K],
    ): EventUnsubscribe {
      ;(_listeners[event] ||= [] as Events[K][]).push(cb)
      return () => {
        _listeners[event] = _listeners[event]?.filter(i => cb !== i) as Events[K][] | undefined
      }
    },
  }
}
