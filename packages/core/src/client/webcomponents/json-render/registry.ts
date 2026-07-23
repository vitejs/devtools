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

export const devtoolsRegistry: Record<string, Component> = {
  Stack,
  Card,
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
