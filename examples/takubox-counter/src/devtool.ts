import { defineDevtool, defineRpcFunction } from 'takubox'

let counter = 0

export default defineDevtool({
  id: 'takubox-counter',
  name: 'Takubox Counter',
  icon: 'ph:counter-duotone',
  setup(ctx) {
    ctx.rpc.register(defineRpcFunction({
      name: 'takubox-counter:get',
      type: 'static',
      handler: () => ({ count: counter }),
    }))

    ctx.rpc.register(defineRpcFunction({
      name: 'takubox-counter:increment',
      type: 'action',
      handler: () => {
        counter += 1
        return { count: counter }
      },
    }))

    ctx.docks.register({
      id: 'takubox-counter',
      title: 'Counter',
      icon: 'ph:counter-duotone',
      type: 'iframe',
      url: '/takubox-counter/',
    })
  },
})
