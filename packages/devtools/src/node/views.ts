import type { DevToolsDockHost as DevToolsViewHostType, DevToolsDockEntry } from '@vitejs/devtools-kit'

export class DevToolsViewHost implements DevToolsViewHostType {
  public readonly views: Map<string, DevToolsDockEntry> = new Map()
  constructor() {
  }

  register(view: DevToolsDockEntry): void {
    this.views.set(view.id, view)
  }
}
