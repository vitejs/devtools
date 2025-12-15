import type { EventEmitter, EventsMap, EventUnsubscribe } from '../types/events'

/**
 * Create event emitter.
 */
export function createEventEmitter<
  Events extends EventsMap,
>(): EventEmitter<Events> {
  const _listeners: Partial<{ [E in keyof Events]: Events[E][] }> = {}

  function emit<K extends keyof Events>(
    event: K,
    ...args: Parameters<Events[K]>
  ) {
    const callbacks = _listeners[event] || []
    for (let i = 0, length = callbacks.length; i < length; i++) {
      const callback = callbacks[i]
      if (callback)
        callback(...args)
    }
  }
  function emitOnce<K extends keyof Events>(
    event: K,
    ...args: Parameters<Events[K]>
  ) {
    emit(event, ...args)
    delete _listeners[event]
  }
  function on<K extends keyof Events>(
    event: K,
    cb: Events[K],
  ): EventUnsubscribe {
    ;(_listeners[event] ||= [] as Events[K][]).push(cb)
    return () => {
      _listeners[event] = _listeners[event]?.filter(i => cb !== i) as Events[K][] | undefined
    }
  }
  function once<K extends keyof Events>(
    event: K,
    cb: Events[K],
  ) {
    const unsubscribe = on(event, ((...args: Parameters<Events[K]>) => {
      unsubscribe()
      return cb(...args)
    }) as Events[K])
    return unsubscribe
  }

  return {
    _listeners,
    emit,
    emitOnce,
    on,
    once,
  }
}
