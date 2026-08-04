import type { Spec } from '@json-render/core'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { JSONUIProvider, Renderer } from '@json-render/vue'
import { defineComponent, h } from 'vue'
import { devtoolsRegistry, UnsupportedComponent } from './registry'

/**
 * Render a json-render `Spec` with the DevTools registry, the same way
 * `ViewJsonRender` does at runtime — including the `UnsupportedComponent`
 * fallback for any element `type` absent from the registry. Accepts a getter
 * instead of a plain `Spec` so stories can rebuild the spec from reactive
 * Storybook `args` (e.g. toggling `variant`/`interactive` live via Controls).
 */
function renderSpec(specOrGetter: Spec | (() => Spec)) {
  return defineComponent({
    setup() {
      const getSpec = typeof specOrGetter === 'function' ? specOrGetter : () => specOrGetter
      const initialState = (getSpec() as any).state ?? {}
      return () => h(
        'div',
        { class: 'max-w-160 p6 bg-base color-base font-sans' },
        h(JSONUIProvider, { registry: devtoolsRegistry, handlers: {}, initialState }, {
          default: () => h(Renderer, { spec: getSpec(), registry: devtoolsRegistry, fallback: UnsupportedComponent }),
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
        component: 'The json-render primitive registry (`Stack`, `Card`, `Tabs`, `Text`, `Badge`, `Button`, `Link`, `Icon`, `Divider`, `TextInput`, `Select`, `Switch`, `KeyValueTable`, `DataTable`, `CodeBlock`, `Progress`, `Tree`) rendered from a declarative spec — the same renderer plugins use to build panels without shipping Vue.',
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
      root: { type: 'Stack', props: { direction: 'column', gap: 16, padding: 4 }, children: ['heading', 'badges', 'buttons', 'progress', 'toggle', 'select', 'links', 'inputs', 'divider', 'kv', 'table', 'code'] },
      heading: { type: 'Text', props: { text: 'Build summary', variant: 'heading' } },
      badges: { type: 'Stack', props: { direction: 'row', gap: 8, align: 'center' }, children: ['b1', 'b2', 'b3', 'b4'] },
      b1: { type: 'Badge', props: { text: 'passing', variant: 'success' } },
      b2: { type: 'Badge', props: { text: '3 warnings', variant: 'warning' } },
      b3: { type: 'Badge', props: { text: '1 error', variant: 'danger' } },
      b4: { type: 'Badge', props: { text: 'v0.3.4', variant: 'default' } },
      buttons: { type: 'Stack', props: { direction: 'row', gap: 8 }, children: ['btn1', 'btn2', 'btn3', 'btn4'] },
      btn1: { type: 'Button', props: { label: 'Rebuild', variant: 'primary', icon: 'ph:arrows-clockwise' } },
      btn2: { type: 'Button', props: { label: 'Open', variant: 'secondary', icon: 'ph:arrow-square-out' } },
      btn3: { type: 'Button', props: { label: 'Delete', variant: 'danger', icon: 'ph:trash' } },
      /* `icon` is intentionally still set here — `loading` takes priority and replaces it with the spinner, so this also demonstrates that precedence. */
      btn4: { type: 'Button', props: { label: 'Deploying…', variant: 'primary', icon: 'ph:rocket-launch', loading: true } },
      progress: { type: 'Progress', props: { value: 68, max: 100, label: 'Bundling' } },
      toggle: { type: 'Switch', props: { label: 'Notifications', value: '{{notifications}}' } },
      select: { type: 'Select', props: {
        label: 'Environment',
        placeholder: 'Choose one…',
        value: 'staging',
        options: [
          { value: 'dev', label: 'Development' },
          { value: 'staging', label: 'Staging' },
          { value: 'prod', label: 'Production', description: 'Live traffic', icon: 'ph:warning' },
        ],
      } },
      links: { type: 'Stack', props: { direction: 'row', gap: 16 }, children: ['link', 'rejectedLink'] },
      link: { type: 'Link', props: { href: 'https://vite.dev', label: 'Vite docs', icon: 'ph:arrow-square-out' } },
      /* `javascript:` is not in the allowed scheme list — this must render as plain text, never as an `<a>`. */
      rejectedLink: { type: 'Link', props: { href: 'javascript:alert(1)', label: 'Rejected href (renders as text)' } },
      inputs: { type: 'Stack', props: { direction: 'row', gap: 16 }, children: ['search', 'loadingInput'] },
      search: { type: 'TextInput', props: { type: 'search', placeholder: 'Filter modules…' } },
      loadingInput: { type: 'TextInput', props: { placeholder: 'Saving…', loading: true } },
      divider: { type: 'Divider', props: { label: 'Details' } },
      kv: { type: 'KeyValueTable', props: { data: {
        Vite: '8.1.2',
        Node: '24.17.0',
        Mode: 'production',
      } } },
      table: { type: 'DataTable', props: {
        columns: [{ key: 'file', label: 'File' }, { key: 'size', label: 'Size' }],
        rows: [
          { file: 'index.js', size: '124 kB' },
          { file: 'vendor.js', size: '612 kB' },
          { file: 'style.css', size: '18 kB' },
        ],
        height: 160,
      } },
      code: { type: 'CodeBlock', props: { filename: 'vite.config.ts', code: 'export default defineConfig({\n  plugins: [DevTools()],\n})' } },
    },
  } as unknown as Spec),
}

/**
 * A `Card` grouping content under a titled, bordered surface. `secondary`
 * tints the background with no border; `ghost` and `primary` are untinted.
 * `info`/`success`/`warning`/`danger` each draw a light body tint, a
 * stronger same-hue header bar, and a matching border. `interactive`
 * strengthens the border on hover (same hue for the four semantic variants)
 * and tints each row's (`Stack`) background. `collapsible` + `defaultCollapsed`
 * control the initial collapse state; clear `title` to confirm the header
 * (and its chevron) still renders without one.
 */
interface CardArgs {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'info' | 'success' | 'warning'
  rowVariant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'info' | 'success' | 'warning'
  interactive: boolean
  title: string
  collapsible: boolean
  defaultCollapsed: boolean
}

export const Card: StoryObj<Meta<CardArgs>> = {
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger', 'info', 'success', 'warning'] },
    rowVariant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger', 'info', 'success', 'warning'] },
    interactive: { control: 'boolean' },
    title: { control: 'text' },
    collapsible: { control: 'boolean' },
    defaultCollapsed: { control: 'boolean' },
  },
  args: { variant: 'primary', rowVariant: 'ghost', interactive: false, title: 'Plugin', collapsible: true, defaultCollapsed: false },
  render: args => renderSpec(() => ({
    root: 'root',
    state: {},
    elements: {
      root: { type: 'Card', props: { title: args.title, collapsible: args.collapsible, defaultCollapsed: args.defaultCollapsed, variant: args.variant, interactive: args.interactive }, children: ['body'] },
      body: { type: 'Stack', props: { direction: 'column', gap: 4, padding: 4 }, children: ['row1', 'row2'] },
      row1: { type: 'Stack', props: { direction: 'row', gap: 8, align: 'center', variant: args.rowVariant, interactive: args.interactive }, children: ['t', 'badge'] },
      t: { type: 'Text', props: { text: 'vite-plugin-inspect', variant: 'code' } },
      badge: { type: 'Badge', props: { text: 'enabled', variant: 'success' } },
      row2: { type: 'Stack', props: { direction: 'row', gap: 8, align: 'center', variant: args.rowVariant, interactive: args.interactive }, children: ['t2', 'badge2'] },
      t2: { type: 'Text', props: { text: 'vite-plugin-vue', variant: 'code' } },
      badge2: { type: 'Badge', props: { text: 'enabled', variant: 'success' } },
    },
  } as unknown as Spec)),
}

/**
 * `Tabs` switches which of its `children` renders, positionally matched to
 * `tabs[]` — no `visible` plumbing needed in the spec. Each panel here is a
 * `Card` of `Stack` rows (the same composition the `Card` story above uses
 * standalone), showing that a tab panel is an ordinary element tree, not a
 * special slot. Uncontrolled (no `value` binding), so each tab click drives
 * Tabs' own local state; toggle `orientation` below to compare the
 * underlined horizontal bar against the left-rail vertical layout, and use
 * arrow keys / Home / End once a tab has focus to exercise the
 * roving-tabindex keyboard navigation.
 */
interface TabsArgs {
  orientation: 'horizontal' | 'vertical'
}

export const Tabs: StoryObj<Meta<TabsArgs>> = {
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
  args: { orientation: 'horizontal' },
  render: args => renderSpec(() => ({
    root: 'root',
    state: {},
    elements: {
      root: {
        type: 'Tabs',
        props: {
          orientation: args.orientation,
          tabs: [
            { value: 'mfe', label: 'Micro-Frontends', badge: '2', badgeVariant: 'success' },
            { value: 'shells', label: 'Shells' },
            { value: 'gateway', label: 'Gateway', badge: '1', badgeVariant: 'danger' },
          ],
        },
        children: ['mfeCard', 'shellsCard', 'gatewayCard'],
      },
      mfeCard: { type: 'Card', props: { title: 'Micro-Frontends', variant: 'secondary' }, children: ['mfeRows'] },
      mfeRows: { type: 'Stack', props: { direction: 'column', gap: 4, padding: 4 }, children: ['mfeRow1', 'mfeRow2'] },
      mfeRow1: { type: 'Stack', props: { direction: 'row', gap: 8, align: 'center' }, children: ['mfeRow1Text', 'mfeRow1Badge'] },
      mfeRow1Text: { type: 'Text', props: { text: 'vite-plugin-inspect', variant: 'code' } },
      mfeRow1Badge: { type: 'Badge', props: { text: 'enabled', variant: 'success' } },
      mfeRow2: { type: 'Stack', props: { direction: 'row', gap: 8, align: 'center' }, children: ['mfeRow2Text', 'mfeRow2Badge'] },
      mfeRow2Text: { type: 'Text', props: { text: 'vite-plugin-vue', variant: 'code' } },
      mfeRow2Badge: { type: 'Badge', props: { text: 'enabled', variant: 'success' } },

      shellsCard: { type: 'Card', props: { title: 'Shells', variant: 'secondary' }, children: ['shellsBody'] },
      shellsBody: { type: 'Text', props: { text: 'No shells running locally.', variant: 'caption' } },

      gatewayCard: { type: 'Card', props: { title: 'Gateway', variant: 'secondary' }, children: ['gatewayRow'] },
      gatewayRow: { type: 'Stack', props: { direction: 'row', gap: 8, align: 'center', padding: 4 }, children: ['gatewayRowText', 'gatewayRowBadge'] },
      gatewayRowText: { type: 'Text', props: { text: 'gateway-web', variant: 'code' } },
      gatewayRowBadge: { type: 'Badge', props: { text: 'stale override', variant: 'danger' } },
    },
  } as unknown as Spec)),
}

/**
 * A popover listbox (built on the shared `FloatingPopover` primitive) bound
 * to `/region` — open it with a click or ArrowDown, move the highlight with
 * Arrow/Home/End, commit with Enter, and Escape to close without changing
 * the value. Toggle `searchable` to add a substring filter box to the panel.
 */
interface SelectArgs {
  placeholder: string
  disabled: boolean
  searchable: boolean
}

export const Select: StoryObj<Meta<SelectArgs>> = {
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    searchable: { control: 'boolean' },
  },
  args: { placeholder: 'Choose a region…', disabled: false, searchable: true },
  render: args => renderSpec(() => ({
    root: 'root',
    state: { region: undefined },
    elements: {
      root: { type: 'Select', props: {
        label: 'Region',
        placeholder: args.placeholder,
        disabled: args.disabled,
        searchable: args.searchable,
        value: { $bindState: '/region' },
        options: [
          { value: 'us-east-1', label: 'US East (N. Virginia)' },
          { value: 'us-west-2', label: 'US West (Oregon)' },
          { value: 'eu-west-1', label: 'Europe (Ireland)' },
          { value: 'eu-west-3', label: 'Europe (Paris)', description: 'Lowest latency from CDG' },
          { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
        ],
      } },
    },
  } as unknown as Spec)),
}

/**
 * An element whose `type` has no entry in the registry — e.g. authored
 * against a newer base-catalog version than this client implements, or a
 * plain typo — falls back to a visible, inspectable placeholder instead of
 * silently rendering nothing.
 */
export const UnsupportedComponentFallback: Story = {
  render: () => renderSpec({
    root: 'root',
    state: {},
    elements: {
      root: { type: 'Stack', props: { direction: 'column', gap: 8, padding: 4 }, children: ['label', 'unknown'] },
      label: { type: 'Text', props: { text: 'The next element uses an unrecognized component type:', variant: 'caption' } },
      unknown: { type: 'FutureChart', props: { series: [1, 2, 3] } },
    },
  } as unknown as Spec),
}
