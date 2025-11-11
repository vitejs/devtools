import type { DevToolsDockEntry, DevToolsDockHost as DevToolsDockHostType, DevToolsNodeContext } from '@vitejs/devtools-kit'
import { debounce } from 'perfect-debounce'

export class DevToolsDockHost implements DevToolsDockHostType {
  public readonly views: Map<string, DevToolsDockEntry> = new Map()
  private _sendOnChange: (() => void)

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {
    this._sendOnChange = debounce(() => {
      context.rpc?.boardcast?.$callOptional('vite:core:list-dock-entries:updated')
    }, 10)
  }

  values(): DevToolsDockEntry[] {
    return Array.from(this.views.values())
  }

  register(view: DevToolsDockEntry, force?: boolean): void {
    if (this.views.has(view.id) && !force) {
      throw new Error(`Dock with id "${view.id}" is already registered`)
    }
    this.views.set(view.id, view)
    this._sendOnChange()
  }

  update(view: DevToolsDockEntry): void {
    if (!this.views.has(view.id)) {
      throw new Error(`Dock with id "${view.id}" is not registered. Use register() to add new docks.`)
    }
    this.views.set(view.id, view)
    this._sendOnChange()
  }
}
