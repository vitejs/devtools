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
import { Text } from './components/Text'
import { TextInput } from './components/TextInput'
import { Tree } from './components/Tree'

export const devtoolsRegistry: Record<string, Component> = {
  Stack,
  Card,
  Text,
  Badge,
  Button,
  Icon,
  Divider,
  TextInput,
  KeyValueTable,
  DataTable,
  CodeBlock,
  Progress,
  Tree,
}
