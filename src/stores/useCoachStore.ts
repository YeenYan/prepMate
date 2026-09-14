import { defineStore } from "pinia";
import { ref } from "vue";

export interface CoachTurn {
  role: "coach" | "user";
  text: string;
  timestamp: number;
}

export const useCoachStore = defineStore("coach", () => {
  const turns = ref<CoachTurn[]>([]);
  const muted = ref(false);
  const listening = ref(false);
  const speaking = ref(false);

  function addTurn(role: CoachTurn["role"], text: string) {
    turns.value.push({ role, text, timestamp: Date.now() });
  }

  function clearTurns() {
    turns.value = [];
  }

  return {
    turns,
    muted,
    listening,
    speaking,
    addTurn,
    clearTurns
  };
});
