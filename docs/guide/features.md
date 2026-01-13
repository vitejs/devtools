---
outline: deep
---

# Features

Discover all the features Vite Devtools offers.

## Overview

Shows a quick overview of your app's build analysis, including the build entries, build duration, build directory, number of modules, plugins and more.

![overview](/features/overview.png)

## Modules

Display all files in the bundle in list, detailed list, graph, and folder tree views.

Supports file type filtering and fuzzy search for finding modules.

![modules](/features/modules.png)

Module transformation flow (Parse -> Resolve -> Transform -> Chunk -> Bundle -> Output).

Track the entire process, find bottlenecks and optimizations.

![module-build-flow](/features/module-build-flow.png)

Module Relationship Graph:

![module-relationship-graph](/features/module-graph.png)

Bundled files in folder tree view:

![module-tree](/features/module-tree.png)

In the graph view, the path selector allows you to trace dependencies between 2 modules.

![module-path-selector](/features/module-path-selector.png)

## Plugins

Display all plugins, both official and third-party. Supports plugin type filtering and fuzzy search for finding plugins.

![plugins](/features/plugins.png)

In the plugin details view, see hook costs (Resolve Id, Load, Transform) and processed modules in Build Flow or Sunburst views.

![plugin-details](/features/plugin-details.png)

## Chunks

Display all chunks in your build output in list, detailed list, and graph views.
 Supports fuzzy search for finding chunks.

![chunks](/features/chunks.png)

In the graph view, the path selector allows you to trace references between 2 chunks.

![chunk-path-selector](/features/chunk-path-selector.png)

Click a chunk to see details including filename, size, all included modules and more.

![chunk-details](/features/chunk-details.png)

## Assets

Display all static assets in your build output in list, folder tree, treemap, sunburst, and flamegraph views. Supports fuzzy search for finding assets.

![assets](/features/assets.png)

Asset Treemap View:

![asset-treemap](/features/asset-treemap.png)

Asset Sunburst View:

![asset-sunburst](/features/asset-sunburst.png)

Click an asset to view details including name, size, related chunks, and asset relationships.

![asset-details](/features/asset-details.png)

## Packages

Display all npm dependencies in your bundle in table and treemap views, and detect duplicated packages, including both direct and transitive dependencies.

Supports dependency type filtering (direct/transitive) and fuzzy search for finding packages.

![packages](/features/packages.png)

Packages Size Graph View:

![package-treemap](/features/package-treemap.png)

Click a package to see details including name, size, bundled files and more.

![package-details](/features/package-details.png)

## Session Compare

Compare and analyze the bundle changes, including bundle size, initial js size, number of modules, plugins, chunks, assets.

![session-compare](/features/session-compare.png)
