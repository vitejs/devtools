import { defineCatalog, defineSchema } from '@json-render/core'
import { z } from 'zod'

/**
 * DevTools json-render schema — defines the spec shape.
 * Uses the default json-render schema.
 */
export const devtoolsSchema = defineSchema(s => ({
  spec: s.object({
    root: s.string(),
    elements: s.map({
      type: s.ref('catalog.components'),
      props: s.propsOf('catalog.components'),
      children: s.array(s.string()),
    }),
  }),
  catalog: s.object({
    components: s.map({
      props: s.zod(),
      description: s.string(),
    }),
    actions: s.map({
      params: s.zod(),
      description: s.string(),
    }),
  }),
}))

/**
 * DevTools component catalog.
 * These are the built-in components available to plugins via json-render specs.
 */
export const devtoolsCatalog = defineCatalog(devtoolsSchema, {
  components: {
    Stack: {
      props: z.object({
        direction: z.enum(['vertical', 'horizontal']).default('vertical'),
        gap: z.number().default(8),
        align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
        justify: z.enum(['start', 'center', 'end', 'space-between', 'space-around']).optional(),
        padding: z.number().optional(),
      }),
      description: 'Layout container that arranges children vertically or horizontally',
    },
    Card: {
      props: z.object({
        title: z.string().optional(),
        collapsible: z.boolean().default(false),
      }),
      description: 'Container with optional title and collapsible behavior',
    },
    Text: {
      props: z.object({
        content: z.string(),
        variant: z.enum(['heading', 'body', 'caption', 'code']).default('body'),
      }),
      description: 'Display text with different visual styles',
    },
    Badge: {
      props: z.object({
        text: z.string(),
        variant: z.enum(['info', 'success', 'warning', 'error', 'default']).default('default'),
      }),
      description: 'Status badge label',
    },
    Button: {
      props: z.object({
        label: z.string(),
        icon: z.string().optional(),
        variant: z.enum(['primary', 'secondary', 'ghost', 'danger']).default('secondary'),
        disabled: z.boolean().default(false),
      }),
      description: 'Clickable button that triggers an action via the "press" event',
    },
    Icon: {
      props: z.object({
        name: z.string(),
        size: z.number().default(20),
      }),
      description: 'Iconify icon by name',
    },
    Divider: {
      props: z.object({
        label: z.string().optional(),
      }),
      description: 'Visual separator line',
    },
    TextInput: {
      props: z.object({
        placeholder: z.string().optional(),
        value: z.string().optional(),
        label: z.string().optional(),
        disabled: z.boolean().default(false),
      }),
      description: 'Text input field. Use $bindState on the value prop for two-way binding.',
    },
    KeyValueTable: {
      props: z.object({
        title: z.string().optional(),
        entries: z.array(z.object({
          key: z.string(),
          value: z.string(),
        })),
      }),
      description: 'Display key-value pairs in a table',
    },
    DataTable: {
      props: z.object({
        columns: z.array(z.object({
          key: z.string(),
          label: z.string(),
          width: z.string().optional(),
        })),
        rows: z.array(z.record(z.unknown())),
        maxHeight: z.string().optional(),
      }),
      description: 'Tabular data display with columns and rows. Bind "rowClick" event for row selection.',
    },
    CodeBlock: {
      props: z.object({
        code: z.string(),
        language: z.string().default('text'),
        filename: z.string().optional(),
        maxHeight: z.string().optional(),
      }),
      description: 'Display code with syntax highlighting',
    },
    Progress: {
      props: z.object({
        value: z.number(),
        max: z.number().default(100),
        label: z.string().optional(),
      }),
      description: 'Progress bar with label',
    },
    Tree: {
      props: z.object({
        data: z.unknown(),
        expandLevel: z.number().default(1),
      }),
      description: 'Expandable tree view for nested objects',
    },
  },
  actions: {},
})
