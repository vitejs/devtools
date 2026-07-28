export * from './components/DockEmbedded'
export * from './components/DockStandalone'
/**
 * Opt-in strict types for the json-render base catalog — most spec authors
 * use the fully open `JsonRenderElement` from `@vitejs/devtools-kit` instead;
 * import these only to narrow a specific element (`JsonRenderElement<'Tabs', TabsProps>`).
 */
export type { JsonRenderElement, TabDescriptor, TabsProps } from './json-render/registry'

export * from './state/docks'
