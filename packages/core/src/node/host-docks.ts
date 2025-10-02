import type { DevToolsDockEntry, DevToolsDockHost as DevToolsDockHostType, DevToolsNodeContext } from '@vitejs/devtools-kit'

export class DevToolsDockHost implements DevToolsDockHostType {
  public readonly views: Map<string, DevToolsDockEntry> = new Map()

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {
  }

  values(): DevToolsDockEntry[] {
    return Array.from(this.views.values())
  }

  register(view: DevToolsDockEntry): void {
    if (this.views.has(view.id)) {
      throw new Error(`Dock with id "${view.id}" is already registered`)
    }
    this.views.set(view.id, view)
  }

  update(view: DevToolsDockEntry): void {
    if (!this.views.has(view.id)) {
      throw new Error(`Dock with id "${view.id}" is not registered. Use register() to add new docks.`)
    }
    this.views.set(view.id, view)
  }
}
