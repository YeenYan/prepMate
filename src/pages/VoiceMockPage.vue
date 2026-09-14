<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import GlassContainer from "../components/GlassContainer.vue";
import ScoreRing from "../components/ScoreRing.vue";
import { useCoach } from "../composables/useCoach";
import { useSpeech } from "../composables/useSpeech";
import { useBanksStore } from "../stores/useBanksStore";
import { useCoachStore } from "../stores/useCoachStore";
import { useSessionStore } from "../stores/useSessionStore";
import type { ModeKey } from "../types/interview";

const route = useRoute();
const router = useRouter();
const banksStore = useBanksStore();
const coachStore = useCoachStore();
const sessionStore = useSessionStore();
const speech = useSpeech();

const answerDraft = ref("");
const chatInput = ref("");
const scoreToShow = ref(0);

const mode = computed<ModeKey | null>(() => {
  const value = String(route.params.mode || "");
  if (value === "easy" || value === "intermediate" || value === "advanced" || value === "basics") {
    return value;
  }
  return null;
});

const bank = computed(() => (mode.value ? banksStore.getBank(mode.value) : null));
const currentQuestion = computed(() => sessionStore.currentQuestion);

const coachRuntime = computed(() => {
  if (!banksStore.coach) return null;
  return useCoach(banksStore.coach);
});

function speakCoach(text: string) {
  coachStore.addTurn("coach", text);
  if (!coachStore.muted) speech.speak(text);
}

function askCurrentQuestion() {
  if (!currentQuestion.value) return;
  const prompt = currentQuestion.value.voicePrompt || currentQuestion.value.question;
  speakCoach(prompt);
}

onMounted(() => {
  banksStore.init();
  sessionStore.hydrateFromStorage();
  coachStore.clearTurns();

  if (!mode.value || !bank.value || !banksStore.coach || !bank.value.questions.length) return;

  if (!sessionStore.session || sessionStore.session.mode !== mode.value) {
    sessionStore.start(mode.value, bank.value);
  }
  speakCoach(banksStore.coach.persona.greeting);
  askCurrentQuestion();
});

function toggleListening() {
  if (speech.listening.value) {
    speech.stop();
    answerDraft.value = `${answerDraft.value} ${speech.transcript.value} ${speech.interimTranscript.value}`
      .replace(/\s+/g, " ")
      .trim();
    return;
  }
  speech.clearTranscript();
  speech.start();
}

function submitVoiceAnswer() {
  if (!banksStore.coach || !coachRuntime.value || !answerDraft.value.trim()) return;
  const answer = answerDraft.value.trim();
  coachStore.addTurn("user", answer);
  const result = sessionStore.submit(answer, banksStore.coach);
  if (!result || !currentQuestion.value) return;

  scoreToShow.value = result.score;
  const insights = coachRuntime.value.getRelevantInsights(currentQuestion.value);
  const feedback = coachRuntime.value.buildSpokenFeedback({
    score: result.score,
    covered: result.covered,
    missing: result.missing,
    suggestion: result.suggestion
  });

  const combined = `${feedback} ${insights[0] || ""}`.trim();
  speakCoach(`Score ${result.score}. ${combined}`);
}

function nextQuestion() {
  answerDraft.value = "";
  speech.clearTranscript();
  const summary = sessionStore.next();
  if (summary) {
    router.push(`/summary/${summary.sessionId}`);
    return;
  }
  const askNextPhrases = banksStore.coach?.conversation.askNext || ["Next question."];
  speakCoach(askNextPhrases[Math.floor(Math.random() * askNextPhrases.length)]);
  askCurrentQuestion();
}

function skipQuestion() {
  const summary = sessionStore.skip();
  if (summary) {
    router.push(`/summary/${summary.sessionId}`);
    return;
  }
  answerDraft.value = "";
  speech.clearTranscript();
  speakCoach("Skipping. Let us continue.");
  askCurrentQuestion();
}

function repeatQuestion() {
  askCurrentQuestion();
}

function stopAssessment() {
  const summary = sessionStore.stop();
  if (!summary) return;
  router.push(`/summary/${summary.sessionId}`);
}

function askCoachInChat() {
  if (!chatInput.value.trim() || !coachRuntime.value || !banksStore.banks) return;
  const question = chatInput.value.trim();
  coachStore.addTurn("user", question);
  const response = coachRuntime.value.answerCoachChat(question, [
    banksStore.banks.easy,
    banksStore.banks.intermediate,
    banksStore.banks.advanced,
    banksStore.banks.basics
  ]);
  coachStore.addTurn("coach", response);
  chatInput.value = "";
}
</script>

<template>
  <section class="space-y-4 pb-28">
    <GlassContainer class="rounded-[28px] p-4">
      <div class="flex items-center justify-between">
        <h1 class="m-0 text-xl font-semibold">Voice Mock - {{ bank?.title || "Mode" }}</h1>
        <button class="pill-button secondary-button px-3 py-2 text-xs" @click="router.push('/')">
          Home
        </button>
      </div>
      <p class="mb-0 mt-2 text-sm text-[var(--color-text-secondary)]">
        Speak your answers. You can still type if speech is unavailable.
      </p>
    </GlassContainer>

    <GlassContainer class="rounded-[24px] p-4">
      <p class="m-0 text-xs text-[var(--color-text-secondary)]">Current question</p>
      <p class="mb-0 mt-2 text-sm font-medium leading-relaxed">
        {{ currentQuestion?.question || "No active question." }}
      </p>
      <div v-if="scoreToShow > 0" class="mt-3">
        <ScoreRing :score="scoreToShow" />
      </div>
    </GlassContainer>

    <GlassContainer class="rounded-[24px] p-4">
      <textarea
        v-model="answerDraft"
        class="soft-input min-h-24 w-full p-3 text-sm outline-none"
        placeholder="Your spoken transcript appears here. You can edit before submit."
      />
      <p v-if="speech.interimTranscript" class="mb-0 mt-2 text-xs text-[var(--color-text-secondary)]">
        Listening: {{ speech.interimTranscript }}
      </p>
      <p v-if="speech.error" class="mb-0 mt-2 text-xs text-red-600">{{ speech.error }}</p>
      <p v-if="!speech.recognitionSupported" class="mb-0 mt-2 text-xs text-[var(--color-text-secondary)]">
        Speech recognition is unavailable on this device. Use typing mode.
      </p>
    </GlassContainer>

    <GlassContainer class="rounded-[24px] p-4">
      <p class="m-0 text-sm font-semibold">Conversation</p>
      <div class="mt-3 max-h-56 space-y-2 overflow-y-auto">
        <div
          v-for="turn in coachStore.turns"
          :key="`${turn.timestamp}-${turn.role}`"
          class="rounded-2xl px-3 py-2 text-sm"
          :class="
            turn.role === 'coach'
              ? 'bg-white/85 text-[var(--color-text-primary)]'
              : 'ml-6 bg-[var(--color-accent)]/20 text-[var(--color-text-primary)]'
          "
        >
          <p class="m-0 whitespace-pre-wrap">{{ turn.text }}</p>
        </div>
      </div>
    </GlassContainer>

    <GlassContainer class="rounded-[24px] p-4">
      <p class="m-0 text-sm font-semibold">Ask coach by text</p>
      <div class="mt-3 flex gap-2">
        <input
          v-model="chatInput"
          class="soft-input min-w-0 flex-1 px-3 py-2 text-sm outline-none"
          placeholder="How should I answer salary?"
        />
        <button class="pill-button primary-button px-4 py-2 text-sm font-semibold" @click="askCoachInChat">
          Ask
        </button>
      </div>
    </GlassContainer>

    <div class="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
      <div class="glass rounded-[22px] p-3">
        <div class="grid grid-cols-3 gap-2">
          <button class="pill-button primary-button px-3 py-3 text-xs font-semibold" @click="toggleListening">
            {{ speech.listening ? "Stop mic" : "Start mic" }}
          </button>
          <button class="pill-button secondary-button px-3 py-3 text-xs" @click="submitVoiceAnswer">
            Submit
          </button>
          <button class="pill-button secondary-button px-3 py-3 text-xs" @click="nextQuestion">
            Next
          </button>
        </div>
        <div class="mt-2 grid grid-cols-4 gap-2">
          <button class="pill-button secondary-button px-2 py-2 text-[11px]" @click="coachStore.muted = !coachStore.muted">
            {{ coachStore.muted ? "Unmute" : "Mute" }}
          </button>
          <button class="pill-button secondary-button px-2 py-2 text-[11px]" @click="repeatQuestion">
            Repeat
          </button>
          <button class="pill-button secondary-button px-2 py-2 text-[11px]" @click="skipQuestion">
            Skip
          </button>
          <button
            class="pill-button secondary-button px-2 py-2 text-[11px]"
            :disabled="sessionStore.answeredCount < 1"
            @click="stopAssessment"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
