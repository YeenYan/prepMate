import { defineStore } from "pinia";
import { computed, ref } from "vue";
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

function readEdits(): Partial<Record<ModeKey, InterviewQuestion[]>> {
  const raw = localStorage.getItem(BANK_EDITS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<Record<ModeKey, InterviewQuestion[]>>;
  } catch {
    return {};
  }
}

function writeEdits(edits: Partial<Record<ModeKey, InterviewQuestion[]>>) {
  localStorage.setItem(BANK_EDITS_KEY, JSON.stringify(edits));
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
      const edits = readEdits();
      for (const mode of MODE_KEYS) {
        if (edits[mode]) loaded[mode].questions = edits[mode];
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
    const saved = readEdits()[mode];
    if (saved) banks.value[mode].questions = saved;
  }

  function saveMode(mode: ModeKey) {
    if (!banks.value) return;
    const edits = readEdits();
    edits[mode] = banks.value[mode].questions;
    writeEdits(edits);
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
    reloadMode,
    updateQuestion,
    deleteQuestion
  };
});
