# Example: DevTools Kit File Explorer Plugin

This example shows how to build a custom Vite DevTools panel with `@vitejs/devtools-kit`.

It provides a **File Explorer** dock that:
- lists files under a target directory
- reads file content on demand
- writes file content in dev (websocket) mode
- works in static mode via RPC dump files

## How It Works

The example has three main parts:

1. Node plugin (`src/node/plugin.ts`)
- creates RPC functions
- registers them with `context.rpc.register(...)`
- hosts the built UI with `context.views.hostStatic(...)`
- registers a dock entry (`type: 'iframe'`) for the panel

2. RPC functions (`src/node/rpc/functions/*`)
- `kit-plugin-file-explorer:getInfo` (`type: 'static'`)
- `kit-plugin-file-explorer:listFiles` (`type: 'query'`, dumped with empty args)
- `kit-plugin-file-explorer:readFile` (`type: 'query'`, fallback `null`)
- `kit-plugin-file-explorer:writeFile` (`type: 'action'`, dev-only behavior)

3. UI app (`src/ui/main.tsx`)
- connects using `getDevToolsRpcClient()`
- detects backend mode (`websocket` vs `static`)
- hides write controls in static mode

## Run The Example

From the `examples/plugin-file-explorer` directory (`cd examples/plugin-file-explorer`):

```bash
pnpm play:dev
```

Then open the app URL, open Vite DevTools, and switch to the **File Explorer** dock.

## Static Build / Preview

Build static output:

```bash
pnpm play:build
```

Preview generated static files:

```bash
pnpm play:preview
```

Static artifacts are generated under:

- `playground/.vite-devtools/.devtools/.connection.json`
- `playground/.vite-devtools/.devtools/.rpc-dump/index.json`
- `playground/.vite-devtools/.devtools/.rpc-dump/*.json`

## Notes

- Default UI base: `/.plugin-file-explorer/`
- Default target directory: `src`
- You can override via options or env:
  - `KIT_PLUGIN_FILE_EXPLORER_UI_BASE`
  - `KIT_PLUGIN_FILE_EXPLORER_TARGET_DIR`
