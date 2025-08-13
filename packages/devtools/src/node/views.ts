import type { DevtoolsViewHost as DevtoolsViewHostType, DevtoolsViewTab } from '@vitejs/devtools-kit'

export class DevtoolsViewHost implements DevtoolsViewHostType {
  constructor() {
  }

  register(view: DevtoolsViewTab): void {
  }
}
