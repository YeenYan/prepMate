<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import GlassContainer from "../components/GlassContainer.vue";
import ScoreRing from "../components/ScoreRing.vue";
import { useSpeech } from "../composables/useSpeech";
import { useBanksStore } from "../stores/useBanksStore";
import { useSessionStore } from "../stores/useSessionStore";
import type { ModeKey } from "../types/interview";

const route = useRoute();
const router = useRouter();
const banksStore = useBanksStore();
const sessionStore = useSessionStore();
const speech = useSpeech();

const inputMode = ref<"type" | "voice">("type");
const answerText = ref("");
const localError = ref("");

const mode = computed<ModeKey | null>(() => {
  const value = String(route.params.mode || "");
  if (value === "easy" || value === "intermediate" || value === "advanced" || value === "basics") {
    return value;
  }
  return null;
});

const bank = computed(() => (mode.value ? banksStore.getBank(mode.value) : null));
const progressText = computed(() => {
  const current = sessionStore.session?.currentIndex ?? 0;
  const total = sessionStore.session?.queue.length ?? 0;
  return `Question ${current + 1} of ${total}`;
});

const canSubmit = computed(() => answerText.value.trim().length > 0);
const latest = computed(() => sessionStore.latestScore);
const currentQuestion = computed(() => sessionStore.currentQuestion);

watch(
  () => sessionStore.currentQuestion?.id,
  () => {
    answerText.value = "";
    speech.clearTranscript();
  }
);

onMounted(() => {
  banksStore.init();
  sessionStore.hydrateFromStorage();

  if (!mode.value) {
    localError.value = "Invalid mode.";
    return;
  }
  if (!bank.value) {
    localError.value = banksStore.error || "Question bank failed to load.";
    return;
  }
  if (!bank.value.questions.length) {
    localError.value = "No questions in this JSON yet.";
    return;
  }
  if (sessionStore.session?.mode === mode.value && sessionStore.session.status !== "completed") {
    return;
  }
  sessionStore.start(mode.value, bank.value);
});

function mergeTranscriptIntoAnswer() {
  const merged = `${answerText.value} ${speech.transcript.value} ${speech.interimTranscript.value}`.trim();
  answerText.value = merged.replace(/\s+/g, " ");
}

function toggleMic() {
  if (speech.listening.value) {
    speech.stop();
    mergeTranscriptIntoAnswer();
    return;
  }
  speech.clearTranscript();
  speech.start();
}

function submitAnswer() {
  if (!canSubmit.value || !banksStore.coach) return;
  mergeTranscriptIntoAnswer();
  sessionStore.submit(answerText.value.trim(), banksStore.coach);
}

function nextQuestion() {
  const summary = sessionStore.next();
  if (summary) router.push(`/summary/${summary.sessionId}`);
}

function stopAssessment() {
  const summary = sessionStore.stop();
  if (!summary) return;
  router.push(`/summary/${summary.sessionId}`);
}
</script>

<template>
  <section class="space-y-4 pb-44">
    <GlassContainer class="rounded-[28px] p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="m-0 text-xs text-[var(--color-text-secondary)]">{{ progressText }}</p>
          <h1 class="mb-0 mt-1 text-lg font-semibold">{{ bank?.title || "Session" }}</h1>
        </div>
        <button class="pill-button secondary-button px-3 py-2 text-xs" @click="router.push('/')">
          Home
        </button>
      </div>
    </GlassContainer>

    <GlassContainer v-if="currentQuestion" class="rounded-[24px] p-4">
      <p class="m-0 text-xs text-[var(--color-text-secondary)]">{{ currentQuestion.category }}</p>
      <h2 class="mb-0 mt-2 text-lg font-semibold leading-snug">{{ currentQuestion.question }}</h2>
      <div v-if="currentQuestion.tags.length" class="mt-2 flex flex-wrap gap-2">
        <span
          v-for="tag in currentQuestion.tags"
          :key="tag"
          class="rounded-full bg-white/70 px-2 py-1 text-[11px] text-[var(--color-text-secondary)]"
        >
          {{ tag }}
        </span>
      </div>
    </GlassContainer>

    <GlassContainer class="rounded-[24px] p-4">
      <div class="mb-3 flex gap-2">
        <button
          class="pill-button px-4 py-2 text-xs"
          :class="inputMode === 'type' ? 'primary-button text-white' : 'secondary-button'"
          @click="inputMode = 'type'"
        >
          Type
        </button>
        <button
          class="pill-button px-4 py-2 text-xs"
          :class="inputMode === 'voice' ? 'primary-button text-white' : 'secondary-button'"
          @click="inputMode = 'voice'"
        >
          Voice
        </button>
      </div>

      <textarea
        v-model="answerText"
        class="soft-input min-h-36 w-full p-3 text-sm outline-none"
        placeholder="Write your answer here..."
      />

      <div v-if="inputMode === 'voice'" class="mt-3 space-y-2">
        <button
          class="pill-button secondary-button w-full px-4 py-3 text-sm font-medium"
          :disabled="!speech.recognitionSupported"
          aria-label="Toggle microphone"
          @click="toggleMic"
        >
          {{ speech.listening ? "Stop microphone" : "Start microphone" }}
        </button>
        <p v-if="speech.interimTranscript" class="m-0 text-xs text-[var(--color-text-secondary)]">
          Listening: {{ speech.interimTranscript }}
        </p>
        <p v-if="!speech.recognitionSupported" class="m-0 text-xs text-[var(--color-text-secondary)]">
          Voice recognition is not supported on this device. Typing is still available.
        </p>
        <p v-if="speech.error" class="m-0 text-xs text-red-600">{{ speech.error }}</p>
      </div>
    </GlassContainer>

    <GlassContainer v-if="latest" class="rounded-[24px] space-y-3 p-4">
      <ScoreRing :score="latest.score" />
      <p class="m-0 text-sm font-semibold">{{ latest.label }}</p>
      <p class="m-0 text-sm text-[var(--color-text-secondary)]">{{ latest.suggestion }}</p>

      <div>
        <p class="mb-1 mt-0 text-xs font-semibold">What you got right</p>
        <p class="m-0 text-sm">{{ latest.covered.join(", ") || "No key points were covered clearly yet." }}</p>
      </div>

      <div>
        <p class="mb-1 mt-0 text-xs font-semibold">What to add or change</p>
        <p class="m-0 text-sm">{{ latest.missing.join(", ") || "No major missing points." }}</p>
      </div>

      <div>
        <p class="mb-1 mt-0 text-xs font-semibold">Sample answer</p>
        <p class="m-0 text-sm leading-relaxed">{{ currentQuestion?.sampleAnswer }}</p>
      </div>

      <div>
        <p class="mb-1 mt-0 text-xs font-semibold">Improved outline</p>
        <ul class="m-0 pl-5 text-sm leading-relaxed">
          <li v-for="item in latest.improvedOutline" :key="item">{{ item }}</li>
        </ul>
      </div>
    </GlassContainer>

    <p v-if="localError || banksStore.error" class="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
      {{ localError || banksStore.error }}
    </p>

    <div class="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
      <div class="glass rounded-[22px] p-3">
        <div class="grid grid-cols-3 gap-2">
          <button
            class="pill-button primary-button px-3 py-3 text-sm font-semibold"
            :disabled="!canSubmit || sessionStore.session?.status === 'feedback'"
            aria-label="Submit answer"
            @click="submitAnswer"
          >
            Submit
          </button>
          <button class="pill-button secondary-button px-3 py-3 text-sm" @click="sessionStore.skip()">
            Skip
          </button>
          <button
            class="pill-button secondary-button px-3 py-3 text-sm"
            :disabled="sessionStore.answeredCount < 1"
            aria-label="Stop assessment"
            @click="stopAssessment"
          >
            Stop
          </button>
        </div>
        <button
          v-if="sessionStore.session?.status === 'feedback'"
          class="pill-button primary-button mt-2 w-full px-3 py-3 text-sm font-semibold"
          @click="nextQuestion"
        >
          Next question
        </button>
      </div>
    </div>
  </section>
</template>
