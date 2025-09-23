import type { DevtoolsViewHost as DevtoolsViewHostType, DevtoolsViewTab } from '@vitejs/devtools-kit'

export class DevtoolsViewHost implements DevtoolsViewHostType {
  public readonly views: Map<string, DevtoolsViewTab> = new Map()
  constructor() {
  }

  register(view: DevtoolsViewTab): void {
    this.views.set(view.viewId, view)
  }
}
