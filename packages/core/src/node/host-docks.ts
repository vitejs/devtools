import type { DevToolsDockEntry, DevToolsDockHost as DevToolsDockHostType, DevToolsNodeContext } from '../../../kit/src'

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
    this.views.set(view.id, view)
  }
}
