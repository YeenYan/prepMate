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
        background: `conic-gradient(#8b7bd6 ${value * 3.6}deg, #ebe7ff 0deg)`
      }"
      aria-label="Answer score"
    >
      <div class="absolute inset-[6px] grid place-items-center rounded-full bg-white text-sm font-semibold text-[var(--color-text-primary)]">
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
