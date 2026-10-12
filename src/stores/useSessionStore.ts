import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { scoreAnswer } from "../composables/useScoring";
import { pushActiveSession, pushSummary } from "../lib/cloudSync";
import {
  clearActiveSession,
  readActiveSession,
  readLastSummary,
  readSummaryList,
  saveActiveSession,
  saveSummary,
  writeActiveSession,
  writeSummaryList
} from "../composables/useSessionPersistence";
import { shuffleArray } from "../utils/shuffle";
import type {
  CoachKnowledge,
  DifficultyKey,
  InterviewQuestion,
  ModeBank,
  ModeKey,
  ScoreResult,
  SessionAnswer,
  SessionState,
  SummaryRecord
} from "../types/interview";

function createSessionId() {
  return `session-${Date.now()}`;
}

export const useSessionStore = defineStore("session", () => {
  const session = ref<SessionState | null>(null);
  const latestScore = ref<ScoreResult | null>(null);
  const lastSummary = ref<SummaryRecord | null>(readLastSummary());
  const summaryHistory = ref<SummaryRecord[]>(readSummaryList());

  const currentQuestion = computed<InterviewQuestion | null>(() => {
    if (!session.value) return null;
    return session.value.queue[session.value.currentIndex] || null;
  });

  const answeredCount = computed(
    () => session.value?.answers.filter((answer) => !answer.skipped).length || 0
  );
  const skippedCount = computed(
    () => session.value?.answers.filter((answer) => answer.skipped).length || 0
  );
  const remainingCount = computed(() => {
    if (!session.value) return 0;
    return Math.max(session.value.queue.length - session.value.currentIndex - 1, 0);
  });

  function hydrateFromStorage() {
    const saved = readActiveSession();
    if (!saved) return;
    session.value = saved;
  }

  function persist() {
    if (!session.value) return;
    session.value.updatedAt = Date.now();
    saveActiveSession(session.value);
    void pushActiveSession(session.value);
  }

  function start(mode: ModeKey, bank: ModeBank, difficulty?: DifficultyKey) {
    const queue = shuffleArray(bank.questions);
    session.value = {
      sessionId: createSessionId(),
      mode,
      difficulty,
      queue,
      currentIndex: 0,
      status: "answering",
      answers: [],
      startedAt: Date.now(),
      updatedAt: Date.now()
    };
    latestScore.value = null;
    persist();
  }

  function resumeOrStart(mode: ModeKey, bank: ModeBank, difficulty?: DifficultyKey) {
    if (
      session.value &&
      session.value.mode === mode &&
      session.value.difficulty === difficulty &&
      session.value.status !== "completed"
    ) {
      return;
    }
    start(mode, bank, difficulty);
  }

  function submit(userAnswer: string, coach: CoachKnowledge) {
    if (!session.value || !currentQuestion.value) return null;
    const result = scoreAnswer(currentQuestion.value, userAnswer, coach);
    const record: SessionAnswer = {
      questionId: currentQuestion.value.id,
      question: currentQuestion.value.question,
      sampleAnswer: currentQuestion.value.sampleAnswer,
      userAnswer,
      score: result.score,
      feedback: `${result.label}. ${result.suggestion}`,
      covered: result.covered,
      missing: result.missing,
      wrong: result.wrong,
      skipped: false
    };
    session.value.answers.push(record);
    session.value.status = "feedback";
    latestScore.value = result;
    persist();
    return result;
  }

  function skip() {
    if (!session.value || !currentQuestion.value) return;
    session.value.answers.push({
      questionId: currentQuestion.value.id,
      question: currentQuestion.value.question,
      sampleAnswer: currentQuestion.value.sampleAnswer,
      userAnswer: "",
      score: 0,
      feedback: "Skipped",
      covered: [],
      missing: currentQuestion.value.keyPoints,
      wrong: [],
      skipped: true
    });
    return next();
  }

  function next() {
    if (!session.value) return;
    const atLast = session.value.currentIndex >= session.value.queue.length - 1;
    if (atLast) {
      return finish("completed");
    }
    session.value.currentIndex += 1;
    session.value.status = "answering";
    latestScore.value = null;
    persist();
    return null;
  }

  function computeSummary(source: SessionState): SummaryRecord {
    const answered = source.answers.filter((answer) => !answer.skipped);
    const skipped = source.answers.filter((answer) => answer.skipped);
    const averageScore = answered.length
      ? Math.round(answered.reduce((sum, item) => sum + item.score, 0) / answered.length)
      : 0;
    const bestScore = answered.length ? Math.max(...answered.map((item) => item.score)) : 0;
    const weakest =
      answered.length > 0
        ? answered.reduce((prev, current) => (current.score < prev.score ? current : prev))
        : null;

    return {
      sessionId: source.sessionId,
      mode: source.mode,
      difficulty: source.difficulty,
      averageScore,
      answeredCount: answered.length,
      skippedCount: skipped.length,
      remainingCount: Math.max(source.queue.length - source.answers.length, 0),
      bestScore,
      weakestQuestion: weakest?.question || "N/A",
      completedAt: Date.now(),
      answers: source.answers
    };
  }

  function finish(status: "stopped" | "completed") {
    if (!session.value) return null;
    session.value.status = status;
    const summary = computeSummary(session.value);
    saveSummary(summary);
    lastSummary.value = summary;
    summaryHistory.value = readSummaryList();
    clearActiveSession();
    void pushSummary(summary);
    void pushActiveSession(null);
    return summary;
  }

  function stop() {
    return finish("stopped");
  }

  function getSummaryById(sessionId: string): SummaryRecord | null {
    if (sessionId === "latest") return lastSummary.value;
    return summaryHistory.value.find((item) => item.sessionId === sessionId) || null;
  }

  function clearSession() {
    session.value = null;
    latestScore.value = null;
    clearActiveSession();
    void pushActiveSession(null);
  }

  function applyCloudState(nextSession: SessionState | null, summaries: SummaryRecord[]) {
    const trimmed = summaries.slice(0, 20);
    session.value = nextSession;
    latestScore.value = null;
    writeActiveSession(nextSession);
    summaryHistory.value = trimmed;
    lastSummary.value = trimmed[0] ?? null;
    writeSummaryList(trimmed);
  }

  function applyRemoteSession(nextSession: SessionState | null, updatedAt: number) {
    const localAt = session.value?.updatedAt ?? 0;
    if (!nextSession) {
      if (localAt > updatedAt) return;
      session.value = null;
      latestScore.value = null;
      writeActiveSession(null);
      return;
    }
    if (localAt > nextSession.updatedAt) return;
    if (
      session.value?.sessionId === nextSession.sessionId &&
      session.value.updatedAt === nextSession.updatedAt
    ) {
      return;
    }
    session.value = nextSession;
    latestScore.value = null;
    writeActiveSession(nextSession);
  }

  function applyRemoteSummary(summary: SummaryRecord) {
    const existing = summaryHistory.value.find((item) => item.sessionId === summary.sessionId);
    if (existing && existing.completedAt >= summary.completedAt) return;
    const next = [summary, ...summaryHistory.value.filter((item) => item.sessionId !== summary.sessionId)]
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, 20);
    summaryHistory.value = next;
    lastSummary.value = next[0] ?? null;
    writeSummaryList(next);
  }

  return {
    session,
    latestScore,
    lastSummary,
    summaryHistory,
    currentQuestion,
    answeredCount,
    skippedCount,
    remainingCount,
    hydrateFromStorage,
    applyCloudState,
    applyRemoteSession,
    applyRemoteSummary,
    start,
    resumeOrStart,
    submit,
    skip,
    next,
    stop,
    getSummaryById,
    clearSession
  };
});
