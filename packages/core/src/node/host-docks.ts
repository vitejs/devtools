import type { DevToolsDockEntry, DevToolsDockHost as DevToolsDockHostType, DevToolsDocksUserSettings, DevToolsDockUserEntry, DevToolsNodeContext, DevToolsViewBuiltin } from '@vitejs/devtools-kit'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { createEventEmitter } from '@vitejs/devtools-kit/utils/events'
import { join } from 'pathe'
import { createStorage } from './storage'

export class DevToolsDockHost implements DevToolsDockHostType {
  public readonly views: DevToolsDockHostType['views'] = new Map()
  public readonly events: DevToolsDockHostType['events'] = createEventEmitter()
  public userSettings: SharedState<DevToolsDocksUserSettings> = undefined!

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {

  }

  async init() {
    this.userSettings = await this.context.rpc.sharedState.get('devtoolskit:internal:user-settings', {
      sharedState: createStorage({
        filepath: join(this.context.workspaceRoot, 'node_modules/.vite/devtools/settings.json'),
        initialValue: DEFAULT_STATE_USER_SETTINGS(),
      }),
    })
  }

  values({
    includeBuiltin = true,
  }: {
    includeBuiltin?: boolean
  } = {}): DevToolsDockEntry[] {
    const context = this.context
    const builtinDocksEntries: DevToolsViewBuiltin[] = [
      {
        type: '~builtin',
        id: '~terminals',
        title: 'Terminals',
        icon: 'ph:terminal-duotone',
        category: '~builtin',
        get isHidden() {
          return context.terminals.sessions.size === 0
        },
      },
      {
        type: '~builtin',
        id: '~logs',
        title: 'Logs',
        icon: 'ph:notification-duotone',
        category: '~builtin',
        isHidden: true, // TODO: implement logs
      },
      {
        type: '~builtin',
        id: '~settings',
        title: 'Settings',
        category: '~builtin',
        icon: 'ph:gear-duotone',
      },
    ]

    return [
      ...Array.from(this.views.values()),
      ...(includeBuiltin ? builtinDocksEntries : []),
    ]
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
