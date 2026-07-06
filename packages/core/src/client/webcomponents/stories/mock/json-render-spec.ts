/**
 * A representative json-render spec exercising the DevTools component
 * registry (Stack / Card / Text / Badge / KeyValueTable / Divider / Button).
 * Shaped as a flat element map keyed by id, matching `@json-render/core`'s
 * {@link Spec}.
 */
export function jsonRenderSpecFixture() {
  return {
    root: 'root',
    state: {},
    elements: {
      root: {
        type: 'Stack',
        props: { direction: 'vertical', gap: 12, padding: 4 },
        children: ['heading', 'card', 'actions'],
      },
      heading: {
        type: 'Text',
        props: { content: 'Build Summary', variant: 'heading' },
      },
      card: {
        type: 'Card',
        props: { title: 'Bundle', collapsible: true },
        children: ['stats', 'divider', 'note'],
      },
      stats: {
        type: 'KeyValueTable',
        props: {
          entries: [
            { key: 'Modules', value: '1,284' },
            { key: 'Chunks', value: '17' },
            { key: 'Size (gzip)', value: '312 kB' },
            { key: 'Build time', value: '4.2s' },
          ],
        },
      },
      divider: { type: 'Divider', props: {} },
      note: {
        type: 'Text',
        props: { content: 'Rendered from a json-render spec over RPC shared state.', variant: 'caption' },
      },
      actions: {
        type: 'Stack',
        props: { direction: 'horizontal', gap: 8 },
        children: ['badge', 'button'],
      },
      badge: {
        type: 'Badge',
        props: { text: 'production', variant: 'success' },
      },
      button: {
        type: 'Button',
        props: { label: 'Rebuild', icon: 'i-ph-arrow-clockwise-duotone', variant: 'primary' },
      },
    },
  }
}
