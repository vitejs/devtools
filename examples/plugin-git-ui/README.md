# Example: DevTools Kit Git UI Plugin

This example shows how to build a fully interactive DevTools panel using `@vitejs/devtools-kit`'s **json-render** dock type — with zero client-side code.

It registers a `json-render` dock that displays the current git state: branch, staged/unstaged files, recent commits, and a commit form.

## How It Works

The entire UI is described as a JSON spec on the server side. The DevTools client renders it using built-in components powered by [@json-render/vue](https://github.com/vercel-labs/json-render).

1. Node plugin (`src/node/plugin.ts`)
   - collects git state by running `git` commands (`git branch`, `git log`, `git status`)
   - builds a `JsonRenderSpec` describing the UI layout (Stack, Card, DataTable, TextInput, Button, etc.)
   - stores the spec in a shared state key and registers a `json-render` dock entry
   - registers two RPC functions:
     - `git-ui:refresh` — re-reads git state and updates the spec
     - `git-ui:commit` — runs `git commit -m "..."` with the message from the text input

2. Client rendering (automatic)
   - `ViewJsonRender.vue` subscribes to the shared state key
   - renders the spec using the built-in devtools component registry
   - bridges button clicks → RPC calls via the json-render action system
   - text input uses `$bindState` for two-way binding; the commit action reads the message via `$state`

**Key point**: there is no client-side code in this plugin. No Vue components, no Nuxt app, no iframe. The plugin only writes TypeScript on the server side.

## Run The Example

From the `examples/plugin-git-ui` directory (`cd examples/plugin-git-ui`):

```bash
pnpm play:dev
```

Then open the app URL, open Vite DevTools, and click the **Git** dock entry.

You can also test it from the core playground:

```bash
pnpm -C packages/core run play
```

## Components Used

| Component | Purpose in this example |
|-----------|------------------------|
| `Stack` | Layout — vertical/horizontal flex containers |
| `Card` | Collapsible sections for staged, unstaged, and commits |
| `Text` | Headings, branch name, empty state messages |
| `Badge` | Change count indicator (warning/success) |
| `Button` | Refresh and Commit actions |
| `TextInput` | Commit message input with `$bindState` binding |
| `DataTable` | Staged files, unstaged files, and commit history |
| `Divider` | Visual separator |
