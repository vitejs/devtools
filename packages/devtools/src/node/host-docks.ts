import type { DevToolsDockEntry, DevToolsDockHost as DevToolsDockHostType } from '@vitejs/devtools-kit'

export class DevToolsDockHost implements DevToolsDockHostType {
  public readonly views: Map<string, DevToolsDockEntry> = new Map()

  constructor() {
  }

  values(): DevToolsDockEntry[] {
    return Array.from(this.views.values())
  }

  register(view: DevToolsDockEntry): void {
    this.views.set(view.id, view)
  }
}
