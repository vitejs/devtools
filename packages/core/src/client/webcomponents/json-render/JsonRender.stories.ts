import type { Spec } from '@json-render/core'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { JSONUIProvider, Renderer } from '@json-render/vue'
import { defineComponent, h } from 'vue'
import { devtoolsRegistry } from './registry'

/**
 * Render a json-render `Spec` with the DevTools registry, the same way
 * `ViewJsonRender` does at runtime.
 */
function renderSpec(spec: Spec) {
  return defineComponent({
    setup() {
      const initialState = (spec as any).state ?? {}
      return () => h(
        'div',
        { class: 'max-w-160 p6 bg-base color-base font-sans' },
        h(JSONUIProvider, { registry: devtoolsRegistry, handlers: {}, initialState }, {
          default: () => h(Renderer, { spec, registry: devtoolsRegistry }),
        }),
      )
    },
  })
}

const meta = {
  title: 'JsonRender/Gallery',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'The json-render primitive registry (`Stack`, `Card`, `Text`, `Badge`, `Button`, `Icon`, `Divider`, `Switch`, `KeyValueTable`, `DataTable`, `CodeBlock`, `Progress`) rendered from a declarative spec — the same renderer plugins use to build panels without shipping Vue.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/** Every common primitive laid out in one spec. */
export const Gallery: Story = {
  render: () => renderSpec({
    root: 'root',
    state: { notifications: true },
    elements: {
      root: { type: 'Stack', props: { direction: 'vertical', gap: 16, padding: 4 }, children: ['heading', 'badges', 'buttons', 'progress', 'toggle', 'divider', 'kv', 'table', 'code'] },
      heading: { type: 'Text', props: { content: 'Build summary', variant: 'heading' } },
      badges: { type: 'Stack', props: { direction: 'horizontal', gap: 8, align: 'center' }, children: ['b1', 'b2', 'b3', 'b4'] },
      b1: { type: 'Badge', props: { text: 'passing', variant: 'success' } },
      b2: { type: 'Badge', props: { text: '3 warnings', variant: 'warning' } },
      b3: { type: 'Badge', props: { text: '1 error', variant: 'error' } },
      b4: { type: 'Badge', props: { text: 'v0.3.4', variant: 'default' } },
      buttons: { type: 'Stack', props: { direction: 'horizontal', gap: 8 }, children: ['btn1', 'btn2', 'btn3'] },
      btn1: { type: 'Button', props: { label: 'Rebuild', variant: 'primary', icon: 'ph:arrows-clockwise' } },
      btn2: { type: 'Button', props: { label: 'Open', variant: 'secondary', icon: 'ph:arrow-square-out' } },
      btn3: { type: 'Button', props: { label: 'Delete', variant: 'danger', icon: 'ph:trash' } },
      progress: { type: 'Progress', props: { value: 68, max: 100, label: 'Bundling' } },
      toggle: { type: 'Switch', props: { label: 'Notifications', value: '{{notifications}}' } },
      divider: { type: 'Divider', props: { label: 'Details' } },
      kv: { type: 'KeyValueTable', props: { title: 'Environment', entries: [
        { key: 'Vite', value: '8.1.2' },
        { key: 'Node', value: '24.17.0' },
        { key: 'Mode', value: 'production' },
      ] } },
      table: { type: 'DataTable', props: {
        columns: [{ key: 'file', label: 'File', width: '60%' }, { key: 'size', label: 'Size' }],
        rows: [
          { file: 'index.js', size: '124 kB' },
          { file: 'vendor.js', size: '612 kB' },
          { file: 'style.css', size: '18 kB' },
        ],
        maxHeight: '160px',
      } },
      code: { type: 'CodeBlock', props: { filename: 'vite.config.ts', code: 'export default defineConfig({\n  plugins: [DevTools()],\n})' } },
    },
  } as unknown as Spec),
}

/** A `Card` grouping content under a titled, bordered surface. */
export const Card: Story = {
  render: () => renderSpec({
    root: 'root',
    state: {},
    elements: {
      root: { type: 'Card', props: { title: 'Plugin', collapsible: false }, children: ['body'] },
      body: { type: 'Stack', props: { direction: 'vertical', gap: 8, padding: 4 }, children: ['t', 'badge'] },
      t: { type: 'Text', props: { content: 'vite-plugin-inspect', variant: 'code' } },
      badge: { type: 'Badge', props: { text: 'enabled', variant: 'success' } },
    },
  } as unknown as Spec),
}
