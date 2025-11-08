---
outline: deep
---

# DevTools Kit

> [!WARNING]
> The API is still in development and may change in any version. If you are building on top of it, please mind the version of packages you are using and warn your users about the experimental status.

Vite DevTools offers a shared infrastructure for building custom DevTools for Vite and the frameworks on top of Vite.

// TODO: some introduction from Anthony's Talk

## DevTools Plugin

Plugin/framework authors can extend the DevTools by enhancing the DevTools infrastructure with custom data visualization, actions, and more. A DevTools plugin is a **superset** of Vite plugin.

To get started, in your Vite plugin project, first you need to install the `@vitejs/devtools-kit` package. Usually it's fine to be a dev dependency as we only need it for types on Node.js side.

```zsh
pnpm install -D @vitejs/devtools-kit
```

Then referencing it in your plugin code, it will augment the `Plugin` interface with the `devtools` property.

Inside `devtools.setup`, you will get tools to register custom data visualization, actions, and more.

```ts {1,9-14}
/// <reference types="@vitejs/devtools-kit" />
import { Plugin } from 'vite'

export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    // Do other plugin stuff...
    transform(code, id) {},
    // Devtools setup
    devtools: {
      setup(ctx) {
        console.log('My plugin setup')
      },
    },
  }
}
```

### Register A Dock Entry

Dock entries are the most straight-forward entry for users to interact with your DevTools integration. Usually it will be presented as a floating panel inside user's app, or a sidebar in browser extension mode or standalone mode. "Dock" refers to macOS's Dock, where you switch between different items by clicking on them.

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

The more practical usage is to build an local webpage to draw your own views and do other interactions.

For example, if we hosted a local custom view at `/.my-app`, we can register it as a dock entry like this:

```ts {6}
ctx.docks.register({
  id: 'my-app',
  title: 'My App',
  icon: 'https://my-app.com/logo.svg',
  type: 'iframe',
  url: '/.my-app',
})
```

DevTools can also handles the page hosting for you, assume you have your built SPA page under `./dist/client`, you can register it as a dock entry like this:

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

### Register An Action

Instead of an iframe panel, sometime you might want to register an action button to trigger some actions to the client app. For example, you want to enable a temporary inspector tool to inspect the DOM of the client app and want to have the button on the DevTools dock.

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

And in your package, you can export the sub entrypoint for the action.

```ts [src/vite-devtools-action.ts]
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setupDevToolsAction(ctx: DevToolsClientScriptContext) {
  // Setup action will only execute when the entry is activated the first time

  // Register listeners to handle the events from the client app
  ctx.current.events.on('entry:activated', () => {
    alert('DOM inspector started! ')
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

That's it! When users install your plugin, they can use your action button in the dock, and when the entry is activated the first time, the action will be executed in the user's app for you to handle the logic.

## References

The docs might not cover all the details, please help us to improve it by submitting PRs. And in the meantime, you can refer to the following existing DevTools integrations for reference (but note they might not always be up to date with the latest API changes):

- [UnoCSS Inspector](https://github.com/unocss/unocss/blob/25c0dd737132dc20b257c276ee2bc3ccc05e2974/packages-integrations/inspector/src/index.ts#L140-L150) (a simple iframe-based dock entry)
- `vite-plugin-vue-tracer` (a simple action button to trigger the DOM inspector)
  - [plugin hook](https://github.com/antfu/vite-plugin-vue-tracer/blob/9f86fe723543405eea5d30588fe783796193bfd8/src/plugin.ts#L139-L157)
  - [client script](https://github.com/antfu/vite-plugin-vue-tracer/blob/main/src/client/vite-devtools.ts)
