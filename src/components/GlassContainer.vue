<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: string;
    rounded?: "xl" | "2xl" | "3xl" | "full";
    padding?: boolean;
  }>(),
  { as: "div", rounded: "2xl", padding: true }
);
</script>

<template>
  <component
    :is="as"
    class="glass"
    :class="[
      rounded === 'xl' && 'rounded-xl',
      rounded === '2xl' && 'rounded-2xl',
      rounded === '3xl' && 'rounded-3xl',
      rounded === 'full' && 'rounded-full',
      padding && 'p-4'
    ]"
    v-bind="$attrs"
  >
    <slot />
  </component>
</template>
