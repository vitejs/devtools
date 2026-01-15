---
outline: deep
---

# Dock System

Dock entries are the primary way for users to interact with your DevTools integration. They appear as clickable items in the DevTools dock (similar to macOS Dock), and when activated, they can display:
- An iframe panel with your custom UI
- A custom-rendered panel directly in the user's app
- An action button that triggers client-side scripts

The dock can be presented as a floating panel inside the user's app, a sidebar in browser extension mode, or in standalone mode. "Dock" refers to macOS's Dock, where you switch between different applications by clicking on them.

## Register A Dock Entry

To register a dock entry, you can use the `ctx.docks.register` method to add a new dock entry. The easiest approach is to register a iframe-based dock entry. Here we use VueUse's docs as an example:

```ts {6-12}
export default function VueUseDevToolsDocs(): Plugin {
  return {
    name: 'vueuse:devtools:docs',
    devtools: {
      setup(ctx) {
        ctx.docks.register({
          id: 'vueuse:docs',
          title: 'VueUse',
          icon: 'https://vueuse.org/favicon.svg',
          type: 'iframe',
          url: 'https://vueuse.org',
        })
      },
    }
  }
}
```

The more practical usage is to build a local webpage to draw your own views and handle interactions. This allows you to use any frontend framework (Vue, React, Svelte, etc.) to build your DevTools UI.

For example, if you host a local custom view at `/.my-app`, you can register it as a dock entry like this:

```ts {6}
ctx.docks.register({
  id: 'my-app',
  title: 'My App',
  icon: 'https://my-app.com/logo.svg',
  type: 'iframe',
  url: '/.my-app',
})
```

DevTools can also handle the page hosting for you. If you have your built SPA page under `./dist/client`, you can register it as a dock entry like this:

```ts {2}
const pathClientDist = fileURLToPath(new URL('../dist/client', import.meta.url))
ctx.views.hostStatic('/.my-app', pathClientDist)
ctx.docks.register({
  id: 'my-app',
  title: 'My App',
  icon: 'https://my-app.com/logo.svg',
  type: 'iframe',
  url: '/.my-app',
})
```

This way DevTools will handle the dev server middleware to host the static files for you, and also copy the static files to the dist directory when in production build.

## Register An Action

Instead of an iframe panel, sometimes you might want to register an action button that triggers client-side scripts. This is useful when you want to:
- Enable temporary inspector tools (e.g., DOM inspector, component inspector)
- Toggle features in the user's app
- Trigger one-time actions without showing a UI panel

For example, you might want to enable a temporary inspector tool to inspect the DOM of the client app and have the button appear in the DevTools dock.

```ts {6}
ctx.docks.register({
  id: 'dom-inspector',
  title: 'DOM Inspector',
  type: 'action',
  action: {
    importFrom: 'vite-plugin-my-inspector/vite-devtools-action',
    importName: 'default',
  },
  icon: 'ph:cursor-duotone',
})
```

In your package, export the sub entrypoint for the action. The action script runs in the user's app context, giving you access to the app's DOM, state, and APIs.

```ts [src/vite-devtools-action.ts]
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setupDevToolsAction(ctx: DevToolsClientScriptContext) {
  // Setup action will only execute when the entry is activated the first time

  // Register listeners to handle events from the dock system
  ctx.current.events.on('entry:activated', () => {
    // Your action logic here
    console.log('DOM inspector started!')

    // Example: Enable DOM inspection
    document.body.style.cursor = 'crosshair'

    // You can also communicate with the server using [RPC](./rpc)
  })

  ctx.current.events.on('entry:deactivated', () => {
    // Cleanup when the entry is deactivated
    document.body.style.cursor = ''
  })
}
```

And in your package.json, you can export the sub entrypoint:

```json [package.json]
{
  "name": "vite-plugin-my-inspector",
  "exports": {
    "./vite-devtools-action": "./dist/vite-devtools-action.mjs"
  }
}
```

That's it! When users install your plugin, they can click your action button in the dock. When activated for the first time, the action script will be loaded and executed in the user's app context, allowing you to interact with their application directly.

## Register Custom Renderer

If you want to render your own views directly in the user's app instead of using an iframe, you can register a dock entry with a custom renderer. This gives you full control over the DOM and allows you to use any framework or vanilla JavaScript to build your UI.

```ts {6}
ctx.docks.register({
  id: 'my-custom-view',
  title: 'My Custom View',
  type: 'custom-render',
  renderer: {
    importFrom: 'vite-plugin-my-inspector/vite-devtools-renderer',
    importName: 'default',
  },
  icon: 'ph:file-duotone'
})
```

Similar to [Action](#register-an-action), we write the renderer logic in a client script that we export as a sub export. The renderer gives you a DOM element (`panel`) that you can mount your UI to:

```ts [src/vite-devtools-renderer.ts]
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setupDevToolsCustomRenderer(ctx: DevToolsClientScriptContext) {
  // Setup will only execute when the entry is activated the first time

  // The 'dom:panel:mounted' event is called once when the panel DOM is ready
  // The DOM will be preserved when switching between dock entries
  ctx.current.events.on('dom:panel:mounted', (panel) => {
    // Render your custom DOM and mount to `panel`
    // You can use vanilla JavaScript or any framework you prefer
    const el = document.createElement('div')
    el.style.padding = '16px'
    el.innerHTML = '<h2>Hello from custom render dock!</h2>'

    const btn = document.createElement('button')
    btn.textContent = 'Click me'
    btn.onclick = async () => {
      // You can communicate with the server using [RPC](./rpc)
      // const rpc = ctx.current.rpc
      // const data = await rpc.call('my-plugin:get-data', 'some-id')
      console.log('Button clicked!')
    }
    el.appendChild(btn)
    panel.appendChild(el)

    // You can also use frameworks like Vue, React, etc.
    // import { createApp } from 'vue'
    // createApp(MyComponent).mount(panel)
  })

  // Cleanup when the entry is deactivated (optional)
  ctx.current.events.on('entry:deactivated', () => {
    // Cleanup logic if needed
  })
}
```

**Note**: The panel DOM is preserved when users switch between dock entries, so you only need to set up your UI once in the `dom:panel:mounted` event. If you need to update the UI based on server state, use [RPC calls](./rpc#call-server-functions-from-client) to fetch fresh data.
