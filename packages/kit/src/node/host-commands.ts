import type {
  DevToolsCommandHandle,
  DevToolsCommandsHost as DevToolsCommandsHostType,
  DevToolsServerCommandEntry,
  DevToolsServerCommandInput,
} from '../types/commands'
import type { KitNodeContext } from './context'
import { createEventEmitter } from 'devframe/utils/events'
import { diagnostics } from './diagnostics'

export class DevToolsCommandsHost implements DevToolsCommandsHostType {
  public readonly commands: DevToolsCommandsHostType['commands'] = new Map()
  public readonly events: DevToolsCommandsHostType['events'] = createEventEmitter()

  constructor(
    public readonly context: KitNodeContext,
  ) {}

  register(command: DevToolsServerCommandInput): DevToolsCommandHandle {
    if (this.commands.has(command.id)) {
      throw diagnostics.DTK0055.throw({ id: command.id })
    }
    this.commands.set(command.id, command)
    this.events.emit('command:registered', this.toSerializable(command))

    return {
      id: command.id,
      update: (patch: Partial<Omit<DevToolsServerCommandInput, 'id'>>) => {
        if ('id' in patch) {
          throw diagnostics.DTK0056.throw()
        }
        const existing = this.commands.get(command.id)
        if (!existing) {
          throw diagnostics.DTK0057.throw({ id: command.id })
        }
        Object.assign(existing, patch)
        this.events.emit('command:registered', this.toSerializable(existing))
      },
      unregister: () => this.unregister(command.id),
    }
  }

  unregister(id: string): boolean {
    const deleted = this.commands.delete(id)
    if (deleted) {
      this.events.emit('command:unregistered', id)
    }
    return deleted
  }

  async execute(id: string, ...args: any[]): Promise<unknown> {
    const found = this.findCommand(id)
    if (!found) {
      throw diagnostics.DTK0057.throw({ id })
    }
    if (!found.handler) {
      throw new Error(`Command "${id}" has no handler (group-only command)`)
    }
    return found.handler(...args)
  }

  list(): DevToolsServerCommandEntry[] {
    return Array.from(this.commands.values()).map(cmd => this.toSerializable(cmd))
  }

  private findCommand(id: string): DevToolsServerCommandInput | undefined {
    // Check top-level
    const topLevel = this.commands.get(id)
    if (topLevel)
      return topLevel

    // Search children
    for (const cmd of this.commands.values()) {
      if (cmd.children) {
        const child = cmd.children.find((c: DevToolsServerCommandInput) => c.id === id)
        if (child)
          return child
      }
    }

    return undefined
  }

  private toSerializable(cmd: DevToolsServerCommandInput): DevToolsServerCommandEntry {
    const { handler: _, children, ...rest } = cmd
    return {
      ...rest,
      source: 'server',
      ...(children
        ? { children: children.map((c: DevToolsServerCommandInput) => this.toSerializable(c)) }
        : {}
      ),
    }
  }
}
