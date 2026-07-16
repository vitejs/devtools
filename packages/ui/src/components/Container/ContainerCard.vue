<script setup lang="ts">
// Framework-neutral card container styled only with shared semantic shortcuts
// (`bg-base` / `border-base`) so it renders identically on the Wind4 (Nuxt)
// and Wind3 (webcomponents) surfaces. Header and footer wrappers only render
// when their slots are filled; the default slot is the body.
</script>

<template>
  <div bg-base border="~ base rounded-lg" of-hidden>
    <div v-if="$slots.header" px4 py2 border="b base">
      <slot name="header" />
    </div>
    <slot />
    <div v-if="$slots.footer" px6 py4 border="t base">
      <slot name="footer" />
    </div>
  </div>
</template>
