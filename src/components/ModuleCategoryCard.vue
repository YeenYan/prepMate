<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  label: string;
  count: number;
  icon: Component;
  iconClass: string;
  disabled?: boolean;
}>();

defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    class="module-card w-full disabled:cursor-not-allowed disabled:opacity-45"
    :disabled="disabled || count === 0"
    @click="$emit('click')"
  >
    <div
      class="flex h-10 w-10 items-center justify-center rounded-xl"
      :class="iconClass"
    >
      <component :is="icon" class="h-5 w-5" aria-hidden="true" />
    </div>
    <p class="mb-0 mt-4 text-[15px] font-semibold leading-tight text-[var(--color-text-primary)]">
      {{ label }}
    </p>
    <p class="mb-0 mt-1 text-xs text-[var(--color-text-secondary)]">
      {{ count === 1 ? "1 question" : `${count} questions` }}
    </p>
  </button>
</template>
