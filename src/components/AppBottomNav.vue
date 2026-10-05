<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import {
  ChatBubbleLeftRightIcon,
  HomeIcon,
  Squares2X2Icon,
  UserCircleIcon
} from "@heroicons/vue/24/outline";
import {
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightSolid,
  HomeIcon as HomeSolid,
  Squares2X2Icon as Squares2X2Solid,
  UserCircleIcon as UserCircleSolid
} from "@heroicons/vue/24/solid";

const route = useRoute();

const items = [
  { to: "/", label: "Home", icon: HomeIcon, iconActive: HomeSolid },
  { to: "/mode/basics", label: "Basics", icon: UserCircleIcon, iconActive: UserCircleSolid },
  { to: "/coach", label: "Coach", icon: ChatBubbleLeftRightIcon, iconActive: ChatBubbleLeftRightSolid },
  { to: "/module", label: "Module", icon: Squares2X2Icon, iconActive: Squares2X2Solid }
];

const activePath = computed(() => route.path);

function isActive(to: string) {
  const path = activePath.value;
  if (to === "/") return path === "/";
  if (to === "/mode/basics") return path === "/mode/basics" || path.startsWith("/mode/basics/");
  if (to === "/module") {
    return path === "/module" || (path.startsWith("/mode/") && !path.startsWith("/mode/basics"));
  }
  return path === to || path.startsWith(`${to}/`);
}
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
          :class="isActive(item.to) ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'"
        >
          <component
            :is="isActive(item.to) ? item.iconActive : item.icon"
            class="h-5 w-5"
            aria-hidden="true"
          />
          <span class="mt-1">{{ item.label }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
