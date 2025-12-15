export interface EventsMap {
  [event: string]: any
}

export interface EventUnsubscribe {
  (): void
}

export interface EventEmitter<Events extends EventsMap> {
  /**
   * Calls each of the listeners registered for a given event.
   *
   * ```js
   * ee.emit('tick', tickType, tickDuration)
   * ```
   *
   * @param event The event name.
   * @param args The arguments for listeners.
   */
  emit: <K extends keyof Events>(
    event: K,
    ...args: Parameters<Events[K]>
  ) => void

  /**
   * Calls the listeners for a given event once and then removes the listener.
   *
   * @param event The event name.
   * @param args The arguments for listeners.
   */
  emitOnce: <K extends keyof Events>(
    event: K,
    ...args: Parameters<Events[K]>
  ) => void

  /**
   * Event names in keys and arrays with listeners in values.
   *
   * @internal
   */
  _listeners: Partial<{ [E in keyof Events]: Events[E][] }>

  /**
   * Add a listener for a given event.
   *
   * ```js
   * const unbind = ee.on('tick', (tickType, tickDuration) => {
   *   count += 1
   * })
   *
   * disable () {
   *   unbind()
   * }
   * ```
   *
   * @param event The event name.
   * @param cb The listener function.
   * @returns Unbind listener from event.
   */
  on: <K extends keyof Events>(event: K, cb: Events[K]) => EventUnsubscribe
  /**
   * Add a listener for a given event once.
   *
   * ```js
   * const unbind = ee.once('tick', (tickType, tickDuration) => {
   *   count += 1
   * })
   *
   * disable () {
   *   unbind()
   * }
   * ```
   *
   * @param event The event name.
   * @param cb The listener function.
   * @returns Unbind listener from event.
   */
  once: <K extends keyof Events>(event: K, cb: Events[K]) => EventUnsubscribe
}
