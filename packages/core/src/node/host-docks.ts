import type { DevToolsDockHost as DevToolsDockHostType, DevToolsDockUserEntry, DevToolsNodeContext } from '@vitejs/devtools-kit'
import { createEventEmitter } from '@vitejs/devtools-kit/utils/events'

export class DevToolsDockHost implements DevToolsDockHostType {
  public readonly views: DevToolsDockHostType['views'] = new Map()
  public readonly events: DevToolsDockHostType['events'] = createEventEmitter()

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {
  }

  values(): DevToolsDockUserEntry[] {
    return Array.from(this.views.values())
  }

  register(view: DevToolsDockUserEntry, force?: boolean): void {
    if (this.views.has(view.id) && !force) {
      throw new Error(`Dock with id "${view.id}" is already registered`)
    }
    this.views.set(view.id, view)
    this.events.emit('dock:entry:updated', view)
  }

  update(view: DevToolsDockUserEntry): void {
    if (!this.views.has(view.id)) {
      throw new Error(`Dock with id "${view.id}" is not registered. Use register() to add new docks.`)
    }
    this.views.set(view.id, view)
    this.events.emit('dock:entry:updated', view)
  }
}
