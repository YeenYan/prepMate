<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import GlassContainer from "../components/GlassContainer.vue";
import ScoreRing from "../components/ScoreRing.vue";
import { useSessionStore } from "../stores/useSessionStore";

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const summary = computed(() => sessionStore.getSummaryById(String(route.params.sessionId || "latest")));

const ratingLabel = computed(() => {
  const score = summary.value?.averageScore || 0;
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 40) return "Getting there";
  return "Needs work";
});

function practicePath() {
  if (!summary.value) return "/";
  if (summary.value.difficulty) {
    return `/session/${summary.value.mode}/${summary.value.difficulty}`;
  }
  return `/session/${summary.value.mode}`;
}

function reviewWeakAnswers() {
  if (!summary.value) return;
  router.push(practicePath());
}
</script>

<template>
  <section class="space-y-4 pb-26">
    <GlassContainer v-if="summary" class="rounded-[28px] p-5">
      <p class="m-0 text-xs text-[var(--color-text-secondary)]">Assessment summary</p>
      <h1 class="mb-1 mt-1 text-2xl font-semibold">
        {{ summary.mode.toUpperCase()
        }}<span v-if="summary.difficulty" class="text-base font-medium capitalize">
          · {{ summary.difficulty }}</span
        >
      </h1>
      <div class="mt-3">
        <ScoreRing :score="summary.averageScore" />
      </div>
      <p class="mb-0 mt-2 text-sm text-[var(--color-text-secondary)]">{{ ratingLabel }}</p>
    </GlassContainer>

    <GlassContainer v-if="summary" class="rounded-[24px] p-4">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <p class="m-0">Answered: <strong>{{ summary.answeredCount }}</strong></p>
        <p class="m-0">Skipped: <strong>{{ summary.skippedCount }}</strong></p>
        <p class="m-0">Remaining: <strong>{{ summary.remainingCount }}</strong></p>
        <p class="m-0">Best score: <strong>{{ summary.bestScore }}%</strong></p>
      </div>
      <p class="mb-0 mt-3 text-sm text-[var(--color-text-secondary)]">
        Weakest question: {{ summary.weakestQuestion }}
      </p>
    </GlassContainer>

    <div v-if="summary" class="space-y-3">
      <GlassContainer
        v-for="answer in summary.answers"
        :key="answer.questionId"
        class="rounded-[22px] space-y-2 p-4"
      >
        <p class="m-0 text-sm font-semibold">{{ answer.question }}</p>
        <p class="m-0 text-xs text-[var(--color-text-secondary)]">
          {{ answer.skipped ? "Skipped" : `Score: ${answer.score}%` }}
        </p>
        <p class="m-0 text-sm"><strong>Your answer:</strong> {{ answer.userAnswer || "Skipped." }}</p>
        <p class="m-0 text-sm"><strong>Sample answer:</strong> {{ answer.sampleAnswer }}</p>
        <p class="m-0 text-sm"><strong>Missing points:</strong> {{ answer.missing.join(", ") || "None listed." }}</p>
      </GlassContainer>
    </div>

    <GlassContainer v-if="summary" class="rounded-[24px] p-4">
      <div class="grid grid-cols-3 gap-2">
        <button class="pill-button secondary-button px-3 py-3 text-xs" @click="reviewWeakAnswers">
          Review weak
        </button>
        <button class="pill-button primary-button px-3 py-3 text-xs font-semibold" @click="router.push(practicePath())">
          Practice again
        </button>
        <button class="pill-button secondary-button px-3 py-3 text-xs" @click="router.push('/')">
          Back home
        </button>
      </div>
    </GlassContainer>

    <GlassContainer v-else class="rounded-[24px] p-4">
      <p class="m-0 text-sm">No saved summary yet. Complete a session first.</p>
      <button class="pill-button primary-button mt-3 px-4 py-2 text-sm font-semibold" @click="router.push('/')">
        Go home
      </button>
    </GlassContainer>
  </section>
</template>
