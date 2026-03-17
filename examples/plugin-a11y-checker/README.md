# Example: DevTools Kit A11y Checker Plugin

This example shows how to build an accessibility auditing plugin with `@vitejs/devtools-kit` and [axe-core](https://github.com/dequelabs/axe-core).

It registers an **action dock** that runs an axe-core audit on the current page and reports violations as DevTools logs.

## How It Works

1. Node plugin (`src/node/plugin.ts`)
   - registers an `action` dock entry that points to a client-side script
   - sends a startup log via `context.logs.add(...)`

2. Client script (`src/client/run-axe.ts`)
   - runs `axe.run(document)` when the dock action is triggered
   - maps each violation to a DevTools log with level based on impact (`critical`/`serious` → error, `moderate` → warn, `minor` → info)
   - attaches WCAG tags and element selectors to each log entry
   - updates a summary log with the total violation/pass count

## Run The Example

From the `examples/plugin-a11y-checker` directory (`cd examples/plugin-a11y-checker`):

```bash
pnpm play:dev
```

Then open the app URL, open Vite DevTools, and click the **Run A11y Check** action.
