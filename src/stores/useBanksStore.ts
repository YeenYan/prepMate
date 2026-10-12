import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { pushBankMode } from "../lib/cloudSync";
import { filterBankByDifficulty, loadAllBanks, loadBank, loadCoachKnowledge } from "../utils/bankLoader";
import type {
  CoachKnowledge,
  DifficultyKey,
  InterviewQuestion,
  ModeBank,
  ModeKey
} from "../types/interview";
import { MODE_KEYS } from "../types/interview";

const BANK_EDITS_KEY = "prepmate-bank-edits";

export type BankEditFile = {
  updatedAt: Partial<Record<ModeKey, number>>;
  questions: Partial<Record<ModeKey, InterviewQuestion[]>>;
};

function emptyEditFile(): BankEditFile {
  return { updatedAt: {}, questions: {} };
}

function readEditFile(): BankEditFile {
  const raw = localStorage.getItem(BANK_EDITS_KEY);
  if (!raw) return emptyEditFile();
  try {
    const parsed = JSON.parse(raw) as BankEditFile | Partial<Record<ModeKey, InterviewQuestion[]>>;
    if (parsed && typeof parsed === "object" && "questions" in parsed && "updatedAt" in parsed) {
      return {
        updatedAt: parsed.updatedAt || {},
        questions: parsed.questions || {}
      };
    }
    return { updatedAt: {}, questions: parsed as Partial<Record<ModeKey, InterviewQuestion[]>> };
  } catch {
    return emptyEditFile();
  }
}

function writeEditFile(edits: BankEditFile, syncMode?: ModeKey) {
  localStorage.setItem(BANK_EDITS_KEY, JSON.stringify(edits));
  if (!syncMode) return;
  const questions = edits.questions[syncMode];
  if (!questions) return;
  void pushBankMode(syncMode, questions, edits.updatedAt[syncMode] ?? Date.now());
}

export const useBanksStore = defineStore("banks", () => {
  const banks = ref<Record<ModeKey, ModeBank> | null>(null);
  const coach = ref<CoachKnowledge | null>(null);
  const loading = ref(false);
  const error = ref("");

  function init() {
    if (banks.value && coach.value) return;
    loading.value = true;
    error.value = "";
    try {
      const loaded = loadAllBanks();
      const edits = readEditFile();
      for (const mode of MODE_KEYS) {
        if (edits.questions[mode]) loaded[mode].questions = edits.questions[mode];
      }
      banks.value = loaded;
      coach.value = loadCoachKnowledge();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load JSON data.";
    } finally {
      loading.value = false;
    }
  }

  function getBank(mode: ModeKey, difficulty?: DifficultyKey): ModeBank | null {
    if (!banks.value) init();
    if (!banks.value) return null;
    return filterBankByDifficulty(banks.value[mode], difficulty);
  }

  function reloadMode(mode: ModeKey) {
    if (!banks.value) banks.value = loadAllBanks();
    banks.value[mode] = loadBank(mode);
    const saved = readEditFile().questions[mode];
    if (saved) banks.value[mode].questions = saved;
  }

  function saveMode(mode: ModeKey) {
    if (!banks.value) return;
    const edits = readEditFile();
    edits.questions[mode] = banks.value[mode].questions;
    edits.updatedAt[mode] = Date.now();
    writeEditFile(edits, mode);
  }

  function getEditFile() {
    return readEditFile();
  }

  function replaceEdits(edits: BankEditFile) {
    writeEditFile(edits);
    if (!banks.value) return;
    for (const mode of MODE_KEYS) {
      if (edits.questions[mode]) banks.value[mode].questions = edits.questions[mode];
      else banks.value[mode] = loadBank(mode);
    }
  }

  function applyRemoteMode(mode: ModeKey, questions: InterviewQuestion[], updatedAt: number) {
    const edits = readEditFile();
    const localAt = edits.updatedAt[mode] ?? 0;
    if (localAt > updatedAt) return;
    if (localAt === updatedAt && edits.questions[mode]) return;
    edits.questions[mode] = questions;
    edits.updatedAt[mode] = updatedAt;
    writeEditFile(edits);
    if (banks.value) banks.value[mode].questions = questions;
  }

  function updateQuestion(mode: ModeKey, id: string, question: string, sampleAnswer: string) {
    const bank = banks.value?.[mode];
    if (!bank) return;
    bank.questions = bank.questions.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        question,
        sampleAnswer,
        voicePrompt: item.voicePrompt === item.question ? question : item.voicePrompt
      };
    });
    saveMode(mode);
  }

  function deleteQuestion(mode: ModeKey, id: string) {
    const bank = banks.value?.[mode];
    if (!bank) return;
    bank.questions = bank.questions.filter((item) => item.id !== id);
    saveMode(mode);
  }

  const modeCards = computed(() => {
    if (!banks.value) return [];
    return MODE_KEYS.map((mode) => {
      const bank = banks.value?.[mode];
      return {
        mode,
        title: bank?.title || mode,
        description: bank?.description || "",
        count: bank?.questions.length || 0
      };
    });
  });

  return {
    banks,
    coach,
    loading,
    error,
    modeCards,
    init,
    getBank,
    getEditFile,
    replaceEdits,
    applyRemoteMode,
    reloadMode,
    updateQuestion,
    deleteQuestion
  };
});
