<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowPathIcon,
  ChartBarIcon,
  MicrophoneIcon
} from "@heroicons/vue/24/outline";
import ModuleSectionsBlock from "../components/ModuleSectionsBlock.vue";
import ModuleCategoryCard from "../components/ModuleCategoryCard.vue";
import { useBanksStore } from "../stores/useBanksStore";
import { useSessionStore } from "../stores/useSessionStore";

const router = useRouter();
const banksStore = useBanksStore();
const sessionStore = useSessionStore();

onMounted(() => {
  banksStore.init();
  sessionStore.hydrateFromStorage();
});

const hasResume = computed(() => Boolean(sessionStore.session));
const hasSummary = computed(() => Boolean(sessionStore.lastSummary));
const voiceMockCount = computed(
  () => banksStore.getBank("frontend", "easy")?.questions.length || 0
);

function resumePath() {
  const session = sessionStore.session;
  if (!session) return "/";
  if (session.difficulty) return `/session/${session.mode}/${session.difficulty}`;
  return `/session/${session.mode}`;
}
</script>

<template>
  <section class="space-y-8 pb-32 pt-2">
    <div class="px-0.5 pt-1">
      <p class="m-0 text-sm text-[var(--color-text-secondary)]">Welcome back</p>
      <h1 class="mb-0 mt-1 text-[28px] font-semibold leading-tight">PrepMate</h1>
      <p class="mb-0 mt-2 text-sm text-[var(--color-text-secondary)]">
        Practice by module and difficulty—same layout as Module settings.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <ModuleCategoryCard
        label="VOICE MOCK"
        :count="voiceMockCount"
        :icon="MicrophoneIcon"
        icon-class="bg-indigo-500/20 text-indigo-200"
        @click="router.push('/mock/frontend/easy')"
      />
      <ModuleCategoryCard
        label="LAST SUMMARY"
        :count="hasSummary ? sessionStore.lastSummary?.answeredCount || 0 : 0"
        :icon="ChartBarIcon"
        icon-class="bg-fuchsia-500/20 text-fuchsia-200"
        :disabled="!hasSummary"
        @click="router.push('/summary/latest')"
      />
    </div>

    <button
      type="button"
      class="module-card flex w-full items-center gap-3 px-4 py-3.5 disabled:opacity-45"
      :disabled="!hasResume"
      @click="router.push(resumePath())"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
        <ArrowPathIcon class="h-5 w-5" aria-hidden="true" />
      </span>
      <span class="text-left">
        <p class="m-0 text-sm font-semibold">Resume session</p>
        <p class="mb-0 mt-0.5 text-xs text-[var(--color-text-secondary)]">
          {{ hasResume ? "Continue where you stopped" : "No active session yet" }}
        </p>
      </span>
    </button>

    <ModuleSectionsBlock />

    <p v-if="banksStore.error" class="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
      {{ banksStore.error }}
    </p>
  </section>
</template>
