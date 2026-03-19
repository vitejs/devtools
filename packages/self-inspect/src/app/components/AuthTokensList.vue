<script setup lang="ts">
interface AuthToken {
  authId: string
  ua: string
  origin: string
  timestamp: number
}

defineProps<{
  tokens: AuthToken[]
}>()

const emit = defineEmits<{
  revoke: [authId: string]
}>()

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div flex="~ col gap-3" p4>
    <div flex="~ items-center gap-3" text-xs>
      <span op60>
        {{ tokens.length }} trusted client{{ tokens.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <div v-if="tokens.length === 0" op40 text-sm py4 text-center>
      No auth tokens found.
    </div>

    <table v-else w-full text-sm>
      <thead>
        <tr border="b base" text-left>
          <th px2 py1 font-medium op60 text-xs>
            Auth Token
          </th>
          <th px2 py1 font-medium op60 text-xs>
            User Agent
          </th>
          <th px2 py1 font-medium op60 text-xs>
            Origin
          </th>
          <th px2 py1 font-medium op60 text-xs>
            Trusted At
          </th>
          <th px2 py1 font-medium op60 text-xs text-center>
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="token in tokens" :key="token.authId"
          border="b base" hover:bg-active
        >
          <td px2 py1.5 font-mono text-xs>
            {{ token.authId }}
          </td>
          <td px2 py1.5 text-xs op75 max-w-60 truncate>
            {{ token.ua || '-' }}
          </td>
          <td px2 py1.5 text-xs op75>
            {{ token.origin || '-' }}
          </td>
          <td px2 py1.5 text-xs op75>
            {{ formatDate(token.timestamp) }}
          </td>
          <td px2 py1.5 text-center>
            <button
              text-xs px2 py0.5 rounded
              text-red border="~ red/30"
              hover:bg-red:10
              @click="emit('revoke', token.authId)"
            >
              Revoke
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
