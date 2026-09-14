<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import GlassContainer from "../components/GlassContainer.vue";
import { useBanksStore } from "../stores/useBanksStore";
import { useSessionStore } from "../stores/useSessionStore";
import type { ModeKey } from "../types/interview";

const router = useRouter();
const banksStore = useBanksStore();
const sessionStore = useSessionStore();

onMounted(() => {
  banksStore.init();
  sessionStore.hydrateFromStorage();
});

const cards = computed(() => banksStore.modeCards.filter((card) => card.mode !== "basics"));
const hasResume = computed(() => Boolean(sessionStore.session));
const hasSummary = computed(() => Boolean(sessionStore.lastSummary));

function goMode(mode: ModeKey) {
  router.push(`/mode/${mode}`);
}
</script>

<template>
  <section class="space-y-4 pb-26">
    <GlassContainer class="rounded-[28px] p-5">
      <p class="m-0 text-sm text-[var(--color-text-secondary)]">Welcome</p>
      <h1 class="mt-1 text-[30px] font-semibold leading-tight">PrepMate</h1>
      <p class="mb-0 mt-2 text-sm text-[var(--color-text-secondary)]">
        Your personal interview practice coach
      </p>
    </GlassContainer>

    <div class="grid grid-cols-1 gap-3">
      <button
        v-for="card in cards"
        :key="card.mode"
        class="glass rounded-[24px] p-4 text-left"
        @click="goMode(card.mode)"
      >
        <p class="m-0 text-sm text-[var(--color-text-secondary)]">{{ card.description }}</p>
        <p class="mb-1 mt-2 text-lg font-semibold">{{ card.title }}</p>
        <p class="m-0 text-xs text-[var(--color-text-secondary)]">{{ card.count }} questions</p>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button class="glass rounded-[22px] p-4 text-left" @click="goMode('basics')">
        <p class="m-0 text-base font-semibold">Basic / HR</p>
        <p class="mb-0 mt-1 text-xs text-[var(--color-text-secondary)]">Salary, intro, conflict</p>
      </button>
      <button class="glass rounded-[22px] p-4 text-left" @click="router.push('/mock/easy')">
        <p class="m-0 text-base font-semibold">Voice mock</p>
        <p class="mb-0 mt-1 text-xs text-[var(--color-text-secondary)]">Spoken interview coach</p>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button
        class="glass rounded-[20px] p-4 text-left disabled:opacity-45"
        :disabled="!hasResume"
        @click="router.push(`/session/${sessionStore.session?.mode || 'easy'}`)"
      >
        <p class="m-0 text-sm font-semibold">Resume session</p>
        <p class="mb-0 mt-1 text-xs text-[var(--color-text-secondary)]">
          {{ hasResume ? "Continue where you stopped" : "No active session yet" }}
        </p>
      </button>
      <button
        class="glass rounded-[20px] p-4 text-left disabled:opacity-45"
        :disabled="!hasSummary"
        @click="router.push('/summary/latest')"
      >
        <p class="m-0 text-sm font-semibold">Last summary</p>
        <p class="mb-0 mt-1 text-xs text-[var(--color-text-secondary)]">
          {{ hasSummary ? `${sessionStore.lastSummary?.averageScore || 0}% average` : "No summary yet" }}
        </p>
      </button>
    </div>

    <p v-if="banksStore.error" class="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
      {{ banksStore.error }}
    </p>
  </section>
</template>
