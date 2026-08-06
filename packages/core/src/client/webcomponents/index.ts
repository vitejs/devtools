export * from './components/DockEmbedded'
export * from './components/DockStandalone'
/**
 * Opt-in strict types for the json-render base catalog — most spec authors
 * use the fully open `JsonRenderElement` from `@vitejs/devtools-kit` instead;
 * import these only to narrow a specific element (`JsonRenderElement<'Badge', BadgeProps>`).
 */
export type {
  BadgeProps,
  ButtonProps,
  CardProps,
  CodeBlockProps,
  DataTableColumn,
  DataTableProps,
  DividerProps,
  IconProps,
  JsonRenderElement,
  KeyValueTableProps,
  LinkProps,
  ProgressProps,
  SelectOption,
  SelectProps,
  StackProps,
  SwitchProps,
  TabDescriptor,
  TabsProps,
  TextInputProps,
  TextProps,
  TreeProps,
} from './json-render/registry'
export type { DevToolsDocksContext } from './state/context'

export * from './state/docks'
