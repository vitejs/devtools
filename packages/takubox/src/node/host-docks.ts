import type { DevToolsDockEntry, DevToolsDockHost as DevToolsDockHostType, DevToolsDocksUserSettings, DevToolsDockUserEntry, DevToolsNodeContext, DevToolsViewBuiltin, DevToolsViewIframe, RemoteConnectionInfo, RemoteDockOptions } from 'takubox/types'
import type { SharedState } from 'takubox/utils/shared-state'
import { join } from 'pathe'
import { DEFAULT_STATE_USER_SETTINGS, REMOTE_CONNECTION_KEY } from 'takubox/constants'
import { createEventEmitter } from 'takubox/utils/events'
import { getInternalContext } from './context-internal'
import { logger } from './diagnostics'
import { createStorage } from './storage'

interface RemoteDockRecord {
  token: string
  options: Required<RemoteDockOptions>
}

function normaliseRemoteOptions(remote: true | RemoteDockOptions): Required<RemoteDockOptions> {
  const opts = remote === true ? {} : remote
  return {
    transport: opts.transport ?? 'fragment',
    originLock: opts.originLock ?? true,
  }
}

function base64UrlEncode(value: string): string {
  // URL-safe base64 without padding so the descriptor is compact and safe to
  // drop into a URL without escaping.
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function buildRemoteUrl(baseUrl: string, payload: RemoteConnectionInfo, transport: 'fragment' | 'query'): string {
  const encoded = base64UrlEncode(JSON.stringify(payload))
  const param = `${REMOTE_CONNECTION_KEY}=${encoded}`
  if (transport === 'fragment') {
    // Replace any existing fragment bearing our key; otherwise append.
    const hashIdx = baseUrl.indexOf('#')
    if (hashIdx === -1)
      return `${baseUrl}#${param}`
    const before = baseUrl.slice(0, hashIdx)
    return `${before}#${param}`
  }
  // query
  const qIdx = baseUrl.indexOf('?')
  const hashIdx = baseUrl.indexOf('#')
  const hash = hashIdx === -1 ? '' : baseUrl.slice(hashIdx)
  const beforeHash = hashIdx === -1 ? baseUrl : baseUrl.slice(0, hashIdx)
  const sep = qIdx === -1 || qIdx >= (hashIdx === -1 ? beforeHash.length : hashIdx) ? '?' : '&'
  return `${beforeHash}${sep}${param}${hash}`
}

export class DevToolsDockHost implements DevToolsDockHostType {
  public readonly views: DevToolsDockHostType['views'] = new Map()
  public readonly events: DevToolsDockHostType['events'] = createEventEmitter()
  public userSettings: SharedState<DevToolsDocksUserSettings> = undefined!

  /** Dock-id → allocated remote token + resolved options. */
  private readonly remoteDocks = new Map<string, RemoteDockRecord>()

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
        get when() {
          return context.terminals.sessions.size === 0 ? 'false' : undefined
        },
      },
      {
        type: '~builtin',
        id: '~logs',
        title: 'Logs & Notifications',
        icon: 'ph:notification-duotone',
        category: '~builtin',
        get badge() {
          const size = context.logs.entries.size
          return size > 0 ? String(size) : undefined
        },
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
      ...Array.from(this.views.values(), view => this.projectView(view)),
      ...(includeBuiltin ? builtinDocksEntries : []),
    ]
  }

  private projectView(view: DevToolsDockUserEntry): DevToolsDockUserEntry {
    if (view.type !== 'iframe' || !view.remote)
      return view
    const record = this.remoteDocks.get(view.id)
    const endpoint = getInternalContext(this.context).wsEndpoint
    if (!record || !endpoint)
      return view

    const payload: RemoteConnectionInfo = {
      v: 1,
      backend: 'websocket',
      websocket: endpoint.url,
      authToken: record.token,
      origin: this.resolveDevServerOrigin(),
    }
    return {
      ...view,
      url: buildRemoteUrl(view.url, payload, record.options.transport),
    } satisfies DevToolsViewIframe
  }

  private resolveDevServerOrigin(): string {
    return this.context.host.resolveOrigin()
  }

  register<T extends DevToolsDockUserEntry>(view: T, force?: boolean): {
    update: (patch: Partial<T>) => void
  } {
    if (this.views.has(view.id) && !force) {
      throw logger.TKB0001({ id: view.id }).throw()
    }
    this.prepareRemoteRegistration(view)
    this.views.set(view.id, view)
    this.events.emit('dock:entry:updated', view)

    return {
      update: (patch) => {
        if (patch.id && patch.id !== view.id) {
          throw logger.TKB0002().throw()
        }
        this.update(Object.assign(this.views.get(view.id)!, patch))
      },
    }
  }

  update(view: DevToolsDockUserEntry): void {
    if (!this.views.has(view.id)) {
      throw logger.TKB0003({ id: view.id }).throw()
    }
    this.prepareRemoteRegistration(view)
    this.views.set(view.id, view)
    this.events.emit('dock:entry:updated', view)
  }

  private prepareRemoteRegistration(view: DevToolsDockUserEntry): void {
    const internal = getInternalContext(this.context)
    // Always revoke any previously allocated token for this dock id — covers
    // force re-registration and update() paths.
    internal.revokeRemoteTokensForDock(view.id)
    this.remoteDocks.delete(view.id)

    if (view.type !== 'iframe' || !view.remote)
      return

    const options = normaliseRemoteOptions(view.remote)
    let dockOrigin: string
    try {
      dockOrigin = new URL(view.url).origin
    }
    catch {
      // Relative/invalid URL — origin-lock can't be enforced. Fall back to the
      // dev-server origin; this still works because the iframe loads in the
      // same browser anyway.
      dockOrigin = this.resolveDevServerOrigin()
    }
    const token = internal.allocateRemoteToken(view.id, dockOrigin, options.originLock)
    this.remoteDocks.set(view.id, { token, options })

    // Default `when` to hide the dock in build mode (no WS server exists).
    if (view.when === undefined)
      view.when = 'mode != build'
  }
}
