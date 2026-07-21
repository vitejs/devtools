export * from './context'
export * from './create-install-launcher'
export * from './create-plugin-from-devframe'
export * from './create-process-launcher'
export * from './utils'
export * from './vite-host'

// The hub-side host implementations and the `mountDevframe` primitive
// power kit's `createKitContext` / `createPluginFromDevframe` under the
// hood. Re-export the class names under the legacy `DevTools*` aliases
// so downstream code that already imported them keeps compiling.
export {
  DevframeCommandsHost as DevToolsCommandsHost,
  DevframeDocksHost as DevToolsDockHost,
  DevframeMessagesHost as DevToolsMessagesHost,
  DevframeTerminalsHost as DevToolsTerminalHost,
  mountDevframe,
} from '@devframes/hub/node'
