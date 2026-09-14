<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const items = [
  { to: "/", label: "Home", icon: "●" },
  { to: "/mode/basics", label: "Basics", icon: "◉" },
  { to: "/coach", label: "Coach", icon: "✦" },
  { to: "/summary/latest", label: "Last", icon: "◌" }
];

const activePath = computed(() => route.path);
</script>

<template>
  <nav
    class="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[360px] -translate-x-1/2"
    aria-label="Bottom navigation"
  >
    <div class="glass rounded-full px-3 py-2">
      <div class="flex items-center justify-between gap-1">
        <RouterLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] no-underline transition"
          :class="activePath.startsWith(item.to) && item.to !== '/' ? 'text-[var(--color-accent)]' : activePath === '/' && item.to === '/' ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'"
        >
          <span class="text-base leading-none">{{ item.icon }}</span>
          <span class="mt-1">{{ item.label }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
