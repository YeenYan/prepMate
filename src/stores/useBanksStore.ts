import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { loadAllBanks, loadBank, loadCoachKnowledge } from "../utils/bankLoader";
import type { CoachKnowledge, ModeBank, ModeKey } from "../types/interview";

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
      banks.value = loadAllBanks();
      coach.value = loadCoachKnowledge();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load JSON data.";
    } finally {
      loading.value = false;
    }
  }

  function getBank(mode: ModeKey): ModeBank | null {
    if (!banks.value) init();
    if (!banks.value) return null;
    return banks.value[mode];
  }

  function reloadMode(mode: ModeKey) {
    if (!banks.value) banks.value = loadAllBanks();
    banks.value[mode] = loadBank(mode);
  }

  const modeCards = computed(() => {
    if (!banks.value) return [];
    return (Object.keys(banks.value) as ModeKey[]).map((mode) => {
      const bank = banks.value?.[mode];
      return {
        mode,
        title: bank.title,
        description: bank.description,
        count: bank.questions.length
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
    reloadMode
  };
});
