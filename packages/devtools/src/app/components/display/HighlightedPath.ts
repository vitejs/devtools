import { defineComponent, h } from 'vue'
import { getPluginColor } from '~/utils/color'

// @unocss-include
export default defineComponent({
  name: 'HighlightedPath',
  props: {
    path: {
      type: String,
      required: true,
    },
    minimal: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    return () => {
      const parts = props.path.split(/([?/&:=])/g)

      let type: 'path' | 'query' = 'path'

      const classes: string[][] = parts.map(() => [])
      const styles: string[][] = parts.map(() => [])
      const nodes = parts.map((part) => {
        return h('span', { class: '' }, part)
      })

      const removeIndexes = new Set<number>()

      parts.forEach((part, index) => {
        if (part === '?')
          type = 'query'

        if (type === 'path') {
          if (part.match(/^\.+$/)) {
            classes[index].push('op50')
          }
          else if (part === '/') {
            classes[index].push('op50')
          }
          else if (part === 'node_modules' || part === 'dist' || part === 'lib' || part.match(/^\.\w/)) {
            classes[index].push('op60')
          }

          // If the path is minimal, remove all the parts before the node_modules
          if (part === 'node_modules') {
            if (props.minimal) {
              for (let i = 0; i < index + 2; i++) {
                removeIndexes.add(i)
              }
            }
          }

          if (part === '.pnpm') {
            if (nodes[index]) {
              nodes[index].children = '~'
              classes[index].push('op25!')
              classes[index - 1].push('op25!')
            }
            removeIndexes.add(index + 1)
            removeIndexes.add(index + 2)
            classes[index + 3].push('op25!')
            if (nodes[index + 4]?.children === 'node_modules') {
              removeIndexes.add(index + 3)
              removeIndexes.add(index + 4)
              classes[index + 5].push('op25!')
            }
          }
          if (part === ':') {
            if (nodes[index - 1]) {
              styles[index - 1].push(`color: ${getPluginColor(parts[index - 1])}`)
            }
            classes[index].push('op50')
          }
          if (parts[index - 2] === 'node_modules' && !part.startsWith('.')) {
            const color = `color: ${getPluginColor(parts[index])}`
            styles[index].push(color)
            if (part.startsWith('@')) {
              styles[index + 1].push(color)
              styles[index + 2].push(color)
            }
          }
        }

        if (type === 'query') {
          if (part === '?') {
            classes[index].push('text-red-500 dark:text-red-400')
          }
          else if (part === '&') {
            classes[index].push('text-orange-500 dark:text-orange-400')
          }
          if (part === '=') {
            classes[index].push('text-orange-900 dark:text-orange-200 op50')
          }
          else if (parts[index + 1] === '=') {
            classes[index].push('text-amber-900 dark:text-amber-200')
          }
          else {
            classes[index].push('text-orange-900 dark:text-orange-200')
          }
        }
      })

      nodes.forEach((node, index) => {
        if (node.props) {
          node.props.class = classes[index].join(' ')
          node.props.style = styles[index].join(';')
        }
      })

      Array.from(removeIndexes)
        .sort((a, b) => b - a)
        .forEach((index) => {
          nodes.splice(index, 1)
        })

      return nodes
    }
  },
})
