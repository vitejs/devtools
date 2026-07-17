<script setup lang="ts">
// Framework-neutral card container styled only with shared semantic shortcuts
// (`bg-base` / `border-base`) so it renders identically on the Wind4 (Nuxt)
// and Wind3 (webcomponents) surfaces. Header and footer wrappers only render
// when their slots are filled; the default slot is the body.
</script>

<template>
  <div class="bg-base border border-base rounded-lg of-hidden">
    <div v-if="$slots.header" class="px4 py2 border-b border-base">
      <slot name="header" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="px6 py4 border-t border-base">
      <slot name="footer" />
    </div>
  </div>
</template>
