<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  score: number;
}>();

const value = computed(() => Math.max(0, Math.min(100, Math.round(props.score))));
</script>

<template>
  <div class="flex items-center gap-4">
    <div
      class="relative h-16 w-16 rounded-full"
      :style="{
        background: `conic-gradient(#a855f7 ${value * 3.6}deg, rgb(255 255 255 / 0.08) 0deg)`
      }"
      aria-label="Answer score"
    >
      <div class="absolute inset-[6px] grid place-items-center rounded-full bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text-primary)]">
        {{ value }}%
      </div>
    </div>
    <div class="flex-1">
      <div class="score-track h-3 overflow-hidden rounded-full">
        <div class="score-fill h-full rounded-full" :style="{ width: `${value}%` }"></div>
      </div>
    </div>
  </div>
</template>
