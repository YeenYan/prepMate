<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ForwardIcon } from "@heroicons/vue/24/outline";
import { MicrophoneIcon } from "@heroicons/vue/24/solid";
import HaloOrb from "../components/HaloOrb.vue";
import ScoreRing from "../components/ScoreRing.vue";
import { useCoach } from "../composables/useCoach";
import { useSpeech } from "../composables/useSpeech";
import { useBanksStore } from "../stores/useBanksStore";
import { useCoachStore } from "../stores/useCoachStore";
import { useSessionStore } from "../stores/useSessionStore";
import type { DifficultyKey, ModeKey } from "../types/interview";
import { isDifficultyKey, isModeKey } from "../types/interview";

const route = useRoute();
const router = useRouter();
const banksStore = useBanksStore();
const coachStore = useCoachStore();
const sessionStore = useSessionStore();
const speech = useSpeech();
const {
  listening,
  speaking,
  preparing,
  boundaryIndex,
  boundarySeen,
  spokenText,
  recognitionSupported
} = speech;

const answerDraft = ref("");
const submittedAnswer = ref("");
const submitting = ref(false);
const advancing = ref(false);
const recordSeconds = ref(0);
const questionEl = ref<HTMLElement | null>(null);
let recordTimer = 0;

const mode = computed<ModeKey | null>(() => {
  const value = String(route.params.mode || "");
  return isModeKey(value) ? value : null;
});

const difficulty = computed<DifficultyKey | undefined>(() => {
  const value = String(route.params.difficulty || "");
  if (!value) return undefined;
  return isDifficultyKey(value) ? value : undefined;
});

const bank = computed(() =>
  mode.value ? banksStore.getBank(mode.value, difficulty.value) : null
);
const currentQuestion = computed(() => sessionStore.currentQuestion);
const review = computed(() => sessionStore.latestScore);

const coachRuntime = computed(() => {
  if (!banksStore.coach) return null;
  return useCoach(banksStore.coach);
});

const topicTitle = computed(() => {
  if (!bank.value) return "Interview";
  return `${bank.value.title} Questions`;
});

const questionText = computed(() => currentQuestion.value?.question || "");

const questionWords = computed(() => {
  const parts = questionText.value.match(/\S+|\s+/g) || [];
  let start = 0;
  return parts.map((text) => {
    const word = { text, start, end: start + text.length, space: /^\s+$/.test(text) };
    start += text.length;
    return word;
  });
});

const readingQuestion = computed(
  () => speaking.value && boundarySeen.value && spokenText.value === questionText.value
);

const liveAnswer = computed(() =>
  `${answerDraft.value} ${speech.transcript.value} ${speech.interimTranscript.value}`
    .replace(/\s+/g, " ")
    .trim()
);

const canSubmit = computed(
  () => !submittedAnswer.value && !submitting.value && liveAnswer.value.length > 0
);

const orbState = computed(() => {
  if (speaking.value) return "speaking" as const;
  if (preparing.value) return "thinking" as const;
  if (listening.value) return "listening" as const;
  if (submitting.value) return "thinking" as const;
  if (speech.error.value) return "error" as const;
  return "idle" as const;
});

const statusLabel = computed(() => {
  if (preparing.value) return "Preparing the question";
  if (speaking.value) return "Speaking";
  if (listening.value) return `Listening ${formatDuration(recordSeconds.value)}`;
  if (submitting.value) return "Reviewing your answer";
  if (speech.error.value) return speech.error.value;
  if (review.value) return review.value.label;
  if (!recognitionSupported.value) return "Microphone is unavailable. Type your answer.";
  return "Go ahead, I'm listening";
});

function formatDuration(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function wordClass(word: { start: number; end: number; space: boolean }) {
  if (word.space) return "";
  if (!readingQuestion.value) return "text-white";
  if (boundaryIndex.value >= word.end) return "text-white";
  if (boundaryIndex.value >= word.start) return "karaoke-current";
  return "text-white/35";
}

function speakCoach(text: string) {
  coachStore.addTurn("coach", text);
  if (!coachStore.muted) speech.speak(text);
}

function askCurrentQuestion() {
  if (!questionText.value) return;
  speakCoach(questionText.value);
}

function captureDraft() {
  const next = liveAnswer.value;
  if (next) answerDraft.value = next;
  speech.clearTranscript();
}

function onDraftInput(event: Event) {
  if (listening.value || submitting.value) return;
  answerDraft.value = (event.target as HTMLTextAreaElement).value;
}

function toggleListening() {
  if (submittedAnswer.value || submitting.value) return;
  if (speech.listening.value) {
    speech.stop();
    return;
  }
  speech.clearTranscript();
  speech.start();
}

function submitVoiceAnswer() {
  if (submitting.value || submittedAnswer.value) return;
  if (speech.listening.value) speech.stop();
  captureDraft();
  const answer = answerDraft.value.trim();
  if (!answer || !banksStore.coach || !coachRuntime.value || !currentQuestion.value) return;

  submitting.value = true;
  coachStore.addTurn("user", answer);
  const result = sessionStore.submit(answer, banksStore.coach);
  if (!result) {
    submitting.value = false;
    return;
  }

  const insights = coachRuntime.value.getRelevantInsights(currentQuestion.value);
  const feedback = coachRuntime.value.buildSpokenFeedback({
    score: result.score,
    covered: result.covered,
    missing: result.missing,
    suggestion: result.suggestion
  });
  submittedAnswer.value = answer;
  submitting.value = false;
  speakCoach(`Score ${result.score}. ${feedback} ${insights[0] || ""}`.trim());
}

function nextQuestion() {
  if (advancing.value || !review.value) return;
  advancing.value = true;
  speech.stop();
  speech.stopSpeaking();
  answerDraft.value = "";
  submittedAnswer.value = "";
  speech.clearTranscript();
  const summary = sessionStore.next();
  if (summary) {
    router.push(`/summary/${summary.sessionId}`);
    return;
  }
  advancing.value = false;
  const askNextPhrases = banksStore.coach?.conversation.askNext || ["Next question."];
  speakCoach(askNextPhrases[Math.floor(Math.random() * askNextPhrases.length)]);
  askCurrentQuestion();
}

function repeatQuestion() {
  if (speech.listening.value || submitting.value) return;
  askCurrentQuestion();
}

function skipQuestion() {
  if (advancing.value) return;
  advancing.value = true;
  speech.stop();
  speech.stopSpeaking();
  const summary = sessionStore.skip();
  if (summary) {
    router.push(`/summary/${summary.sessionId}`);
    return;
  }
  advancing.value = false;
  answerDraft.value = "";
  submittedAnswer.value = "";
  speech.clearTranscript();
  speakCoach("Skipping. Let us continue.");
  askCurrentQuestion();
}

watch(listening,
  (now) => {
    window.clearInterval(recordTimer);
    if (now) {
      recordSeconds.value = 0;
      recordTimer = window.setInterval(() => {
        recordSeconds.value += 1;
      }, 1000);
      return;
    }
    if (!advancing.value) captureDraft();
  }
);

watch(boundaryIndex,
  () => {
    questionEl.value?.querySelector("[data-current='true']")?.scrollIntoView({ block: "nearest" });
  }
);

onMounted(() => {
  banksStore.init();
  coachStore.clearTurns();

  if (!mode.value || !bank.value || !banksStore.coach || !bank.value.questions.length) return;
  if (mode.value !== "basics" && !difficulty.value) return;

  sessionStore.start(mode.value, bank.value, difficulty.value);
  speakCoach(banksStore.coach.persona.greeting);
  askCurrentQuestion();
});

onUnmounted(() => {
  window.clearInterval(recordTimer);
  speech.stop();
  speech.stopSpeaking();
});
</script>

<template>
  <section class="mx-auto flex w-full max-w-md flex-col items-center pb-36 pt-2">
    <h1 class="m-0 text-center text-lg font-semibold">{{ topicTitle }}</h1>
    <p v-if="difficulty" class="mb-0 mt-1 text-center text-sm capitalize text-[var(--color-text-secondary)]">
      {{ difficulty }}
    </p>
    <p class="mb-0 mt-1 text-center text-sm text-[var(--color-text-secondary)]" role="status">
      {{ statusLabel }}
    </p>

    <div class="mt-6">
      <HaloOrb :state="orbState" :size="168" :speed="1" color-from="#818cf8" color-to="#f472b6" :label="statusLabel" />
    </div>

    <p
      ref="questionEl"
      class="mb-0 mt-8 max-h-48 w-full overflow-y-auto px-2 text-center text-[22px] font-medium leading-snug tracking-[-0.02em]"
    >
      <span
        v-for="(word, index) in questionWords"
        :key="`${currentQuestion?.id || 'q'}-${index}`"
        :class="wordClass(word)"
        :data-current="readingQuestion && boundaryIndex >= word.start && boundaryIndex < word.end"
      >{{ word.text }}</span>
      <span v-if="!questionText">No active question.</span>
    </p>
    <button
      type="button"
      class="mt-3 text-sm text-[var(--color-text-secondary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      :disabled="listening || submitting"
      @click="repeatQuestion"
    >
      Replay question
    </button>

    <p v-if="listening" class="mb-0 mt-4 text-sm text-[var(--color-text-secondary)]" role="status">
      Recording {{ formatDuration(recordSeconds) }}. Pauses are kept. Submit when you are done.
    </p>

    <textarea
      v-if="!submittedAnswer"
      :value="listening ? liveAnswer : answerDraft"
      class="soft-input mt-4 min-h-24 w-full p-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
      :readonly="listening || submitting"
      aria-label="Your answer"
      placeholder="Your spoken transcript appears here. You can edit it before submit."
      @input="onDraftInput"
    />

    <button
      v-if="canSubmit || submitting"
      type="button"
      class="pill-button primary-button mt-4 w-full px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-45"
      :disabled="submitting"
      @click="submitVoiceAnswer"
    >
      {{ submitting ? "Submitting..." : "Submit answer" }}
    </button>

    <div v-if="submittedAnswer" class="mt-6 w-full">
      <p class="m-0 text-sm font-semibold">Your Answer</p>
      <p class="mb-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">
        {{ submittedAnswer }}
      </p>
    </div>

    <div v-if="review" class="mt-6 w-full space-y-3">
      <ScoreRing :score="review.score" />
      <p class="m-0 text-sm font-semibold">{{ review.label }}</p>
      <p class="m-0 text-sm leading-relaxed text-[var(--color-text-secondary)]">{{ review.suggestion }}</p>
      <p v-if="review.covered.length" class="m-0 text-sm leading-relaxed">
        <span class="font-semibold">What you covered: </span>{{ review.covered.join(", ") }}
      </p>
      <p v-if="review.missing.length" class="m-0 text-sm leading-relaxed">
        <span class="font-semibold">Still missing: </span>{{ review.missing.join(", ") }}
      </p>
      <p v-if="review.wrong.length" class="m-0 text-sm leading-relaxed">
        <span class="font-semibold">Check this: </span>{{ review.wrong.join(", ") }}
      </p>
      <button
        type="button"
        class="pill-button primary-button w-full px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-45"
        :disabled="advancing"
        @click="nextQuestion"
      >
        Next question
      </button>
    </div>

    <div class="fixed bottom-0 left-0 right-0 z-40 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div class="mx-auto grid w-full max-w-md grid-cols-3 items-center">
        <button
          type="button"
          class="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-[var(--color-surface)] text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-45"
          aria-label="Skip question"
          :disabled="advancing"
          @click="skipQuestion"
        >
          <ForwardIcon class="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full border border-white/10 bg-[#2a2a2e] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)] disabled:opacity-45"
          :class="listening ? 'ring-2 ring-[var(--color-accent)]' : ''"
          :aria-pressed="listening"
          :aria-label="listening ? 'Stop recording' : 'Start recording'"
          :disabled="Boolean(submittedAnswer) || submitting || !recognitionSupported"
          @click="toggleListening"
        >
          <MicrophoneIcon class="h-7 w-7" aria-hidden="true" />
        </button>
        <span></span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.karaoke-current {
  color: #fff;
  animation: word-flash 0.7s ease-in-out infinite;
}

@keyframes word-flash {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .karaoke-current {
    animation: none;
  }
}
</style>
