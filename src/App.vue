<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeftIcon, HomeIcon } from "@heroicons/vue/24/outline";
import AppBottomNav from "./components/AppBottomNav.vue";

const route = useRoute();
const router = useRouter();
const layoutStyle = ref<Record<string, string>>({});

const title = computed(() => {
  if (route.path.startsWith("/mode/")) return "Mode Lobby";
  if (route.path.startsWith("/session/")) return "Question Session";
  if (route.path.startsWith("/mock/")) return "Voice Mock";
  if (route.path.startsWith("/summary/")) return "Grade Summary";
  if (route.path.startsWith("/coach")) return "Coach";
  if (route.path.startsWith("/module")) return "Module";
  return "PrepMate";
});

const showBack = computed(() => route.path !== "/");
const showBottomNav = computed(
  () => !route.path.startsWith("/session/") && !route.path.startsWith("/mock/")
);

function syncLayoutViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  layoutStyle.value = {
    height: `${viewport.height}px`,
    top: `${viewport.offsetTop}px`
  };
}

onMounted(() => {
  syncLayoutViewport();
  window.visualViewport?.addEventListener("resize", syncLayoutViewport);
  window.visualViewport?.addEventListener("scroll", syncLayoutViewport);
  document.getElementById("boot-loader")?.remove();
});

onUnmounted(() => {
  window.visualViewport?.removeEventListener("resize", syncLayoutViewport);
  window.visualViewport?.removeEventListener("scroll", syncLayoutViewport);
});
</script>

<template>
  <div class="app-shell" :style="layoutStyle">
    <header
      class="relative z-20 flex items-center justify-between px-4 pb-2 pt-[max(0.8rem,env(safe-area-inset-top))]"
    >
      <button
        v-if="showBack"
        class="pill-button glass h-9 w-9 text-sm"
        aria-label="Go back"
        @click="router.back()"
      >
        <ArrowLeftIcon class="mx-auto h-4 w-4" aria-hidden="true" />
      </button>
      <div v-else class="h-9 w-9"></div>
      <p class="m-0 text-sm font-semibold">{{ title }}</p>
      <button class="pill-button glass h-9 w-9 text-sm" aria-label="Go home" @click="router.push('/')">
        <HomeIcon class="mx-auto h-4 w-4" aria-hidden="true" />
      </button>
    </header>

    <main class="scroll-area flex flex-col px-4 pb-2">
      <router-view />
    </main>

    <AppBottomNav v-if="showBottomNav" />
  </div>
</template>
