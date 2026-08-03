import type { Component } from 'vue'
import { Badge } from './components/Badge'
import { Button } from './components/Button'
import { Card } from './components/Card'
import { CodeBlock } from './components/CodeBlock'
import { DataTable } from './components/DataTable'
import { Divider } from './components/Divider'
import { Icon } from './components/Icon'
import { KeyValueTable } from './components/KeyValueTable'
import { Progress } from './components/Progress'
import { Stack } from './components/Stack'
import { Switch } from './components/Switch'
import { Tabs } from './components/Tabs'
import { Text } from './components/Text'
import { TextInput } from './components/TextInput'
import { Tree } from './components/Tree'
import { UnsupportedComponent } from './components/UnsupportedComponent'

/**
 * Fallback for any spec element whose `type` isn't a key in
 * {@link devtoolsRegistry} — pass as `<Renderer :fallback>` so unrecognized
 * component types render a visible placeholder instead of nothing.
 */
export { UnsupportedComponent }

/**
 * Per-component `props` shapes, co-located with each component and
 * re-exported here as this catalog's public type surface — the single
 * source of truth a spec author can opt into for strict typing, instead of
 * each component's props duplicated into a separate types package.
 */
export type { BadgeProps } from './components/Badge'
export type { ButtonProps } from './components/Button'
export type { CardProps } from './components/Card'
export type { CodeBlockProps } from './components/CodeBlock'
export type { DataTableColumn, DataTableProps } from './components/DataTable'
export type { DividerProps } from './components/Divider'
export type { IconProps } from './components/Icon'
export type { KeyValueTableProps } from './components/KeyValueTable'
export type { ProgressProps } from './components/Progress'
export type { StackProps } from './components/Stack'
export type { SwitchProps } from './components/Switch'
export type { TabDescriptor, TabsProps } from './components/Tabs'
export type { TextProps } from './components/Text'
export type { TextInputProps } from './components/TextInput'
export type { TreeProps } from './components/Tree'
export type { UIElement as JsonRenderElement } from '@json-render/core'

export const devtoolsRegistry: Record<string, Component> = {
  Stack,
  Card,
  Tabs,
  Text,
  Badge,
  Button,
  Icon,
  Divider,
  TextInput,
  Switch,
  KeyValueTable,
  DataTable,
  CodeBlock,
  Progress,
  Tree,
}
