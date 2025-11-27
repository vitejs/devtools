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

  register<T extends DevToolsDockUserEntry>(view: T, force?: boolean): {
    update: (patch: Partial<T>) => void
  } {
    if (this.views.has(view.id) && !force) {
      throw new Error(`Dock with id "${view.id}" is already registered`)
    }
    this.views.set(view.id, view)
    this.events.emit('dock:entry:updated', view)

    return {
      update: (patch) => {
        if (patch.id && patch.id !== view.id) {
          throw new Error(`Cannot change the id of a dock. Use register() to add new docks.`)
        }
        this.update(Object.assign(this.views.get(view.id)!, patch))
      },
    }
  }

  update(view: DevToolsDockUserEntry): void {
    if (!this.views.has(view.id)) {
      throw new Error(`Dock with id "${view.id}" is not registered. Use register() to add new docks.`)
    }
    this.views.set(view.id, view)
    this.events.emit('dock:entry:updated', view)
  }
}
