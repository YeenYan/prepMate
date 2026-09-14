<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import GlassContainer from "../components/GlassContainer.vue";
import { useBanksStore } from "../stores/useBanksStore";
import type { ModeKey } from "../types/interview";

const route = useRoute();
const router = useRouter();
const banksStore = useBanksStore();

const mode = computed<ModeKey | null>(() => {
  const value = String(route.params.mode || "");
  if (value === "easy" || value === "intermediate" || value === "advanced" || value === "basics") {
    return value;
  }
  return null;
});

onMounted(() => {
  banksStore.init();
});

const bank = computed(() => (mode.value ? banksStore.getBank(mode.value) : null));
const isEmptyBank = computed(() => (bank.value?.questions.length || 0) === 0);

function startAssessment() {
  if (!mode.value || isEmptyBank.value) return;
  router.push(`/session/${mode.value}`);
}

function startVoiceMock() {
  if (!mode.value || isEmptyBank.value) return;
  router.push(`/mock/${mode.value}`);
}
</script>

<template>
  <section class="space-y-4 pb-26">
    <GlassContainer class="rounded-[28px] p-5">
      <button class="pill-button secondary-button px-4 py-2 text-sm" @click="router.push('/')">
        Back
      </button>
      <h1 class="mb-1 mt-4 text-2xl font-semibold">{{ bank?.title || "Mode" }}</h1>
      <p class="m-0 text-sm text-[var(--color-text-secondary)]">
        {{ bank?.description || "Select a mode to begin." }}
      </p>
      <p class="mb-0 mt-3 text-sm text-[var(--color-text-secondary)]">
        {{ bank?.questions.length || 0 }} questions in this bank
      </p>
    </GlassContainer>

    <GlassContainer class="rounded-[24px] p-4">
      <p class="m-0 text-sm text-[var(--color-text-secondary)]">Practice options</p>
      <div class="mt-3 flex gap-2">
        <button
          class="pill-button primary-button flex-1 px-4 py-3 text-sm font-semibold disabled:opacity-45"
          :disabled="isEmptyBank"
          @click="startAssessment"
        >
          Start Assessment
        </button>
        <button
          class="pill-button secondary-button flex-1 px-4 py-3 text-sm font-semibold disabled:opacity-45"
          :disabled="isEmptyBank"
          @click="startVoiceMock"
        >
          Start Voice Mock
        </button>
      </div>
      <button
        class="pill-button secondary-button mt-3 w-full px-4 py-3 text-sm font-semibold disabled:opacity-45"
        :disabled="isEmptyBank"
        @click="startAssessment"
      >
        Practice one random question
      </button>
      <p v-if="isEmptyBank" class="mb-0 mt-3 text-xs text-red-600">
        No questions in this JSON yet.
      </p>
    </GlassContainer>

    <p v-if="!mode" class="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
      Invalid mode route.
    </p>
  </section>
</template>
