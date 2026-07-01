import type { TreeNode } from 'nanovis'
import type { VitePluginBuildInfo } from './plugins'

export type PluginChartInfo = Omit<VitePluginBuildInfo, 'type' | 'plugin_id' | 'plugin_name'> & {
  type: 'module' | 'hook'
  title: string
  text: string
  children?: any[]
}

export type PluginChartNode = TreeNode<PluginChartInfo | undefined>
