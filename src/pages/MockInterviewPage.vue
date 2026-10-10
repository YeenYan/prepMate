<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { MicrophoneIcon, PencilSquareIcon } from "@heroicons/vue/24/outline";
import ModuleCategoryCard from "../components/ModuleCategoryCard.vue";
import { useBanksStore } from "../stores/useBanksStore";
import type { DifficultyKey, ModeKey } from "../types/interview";
import { DIFFICULTY_KEYS, MODE_KEYS } from "../types/interview";

const MODULE_LABEL: Record<ModeKey, string> = {
  basics: "Basics",
  frontend: "Frontend",
  backend: "Backend",
  infrastructure: "Infra",
  scenario: "Scenario"
};

const LEVEL_LABEL: Record<DifficultyKey, string> = {
  easy: "Easy",
  intermediate: "Intermediate",
  advanced: "Advanced"
};

const router = useRouter();
const banksStore = useBanksStore();

const open = ref(false);
const kind = ref<"voice" | "text">("voice");
const step = ref<"module" | "level">("module");
const selectedMode = ref<ModeKey | null>(null);
const selectedLevel = ref<DifficultyKey | null>(null);

onMounted(() => {
  banksStore.init();
});

const totalCount = computed(() => {
  if (!banksStore.banks) return 0;
  return MODE_KEYS.reduce((sum, mode) => sum + banksStore.banks![mode].questions.length, 0);
});

const needsLevel = computed(() => selectedMode.value !== null && selectedMode.value !== "basics");

const primaryLabel = computed(() => {
  if (step.value === "level" || selectedMode.value === "basics") return "Start";
  return "Next";
});

const canContinue = computed(() => {
  if (!selectedMode.value) return false;
  if (step.value === "module") return true;
  if (!selectedLevel.value) return false;
  return questionCount(selectedMode.value, selectedLevel.value) > 0;
});

function questionCount(mode: ModeKey, level?: DifficultyKey) {
  return banksStore.getBank(mode, level)?.questions.length || 0;
}

function openModal(nextKind: "voice" | "text") {
  kind.value = nextKind;
  step.value = "module";
  selectedMode.value = null;
  selectedLevel.value = null;
  open.value = true;
}

function closeModal() {
  open.value = false;
}

function chooseModule(mode: ModeKey) {
  selectedMode.value = mode;
  selectedLevel.value = null;
}

function onPrimary() {
  if (!canContinue.value || !selectedMode.value) return;
  if (step.value === "module" && needsLevel.value) {
    step.value = "level";
    return;
  }
  const base = kind.value === "voice" ? "/mock" : "/session";
  if (selectedMode.value === "basics") {
    router.push(`${base}/basics`);
  } else if (selectedLevel.value) {
    router.push(`${base}/${selectedMode.value}/${selectedLevel.value}`);
  }
  closeModal();
}
</script>

<template>
  <section class="pb-32 pt-2">
    <div class="grid grid-cols-2 gap-3">
      <ModuleCategoryCard
        label="VOICE MOCK"
        :count="totalCount"
        :icon="MicrophoneIcon"
        icon-class="bg-[var(--color-accent)]/20 text-[#c5d2ff]"
        @click="openModal('voice')"
      />
      <ModuleCategoryCard
        label="NON-VOICE"
        :count="totalCount"
        :icon="PencilSquareIcon"
        icon-class="bg-[var(--color-accent)]/20 text-[#c5d2ff]"
        @click="openModal('text')"
      />
    </div>

    <p v-if="banksStore.error" class="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
      {{ banksStore.error }}
    </p>

    <Teleport to="body">
    <Transition name="popup">
      <div v-if="open" class="fixed inset-0 z-[80] flex items-center justify-center px-5">
      <button class="popup-backdrop absolute inset-0 bg-black/50" aria-label="Close" @click="closeModal"></button>
      <div
        class="popup-panel relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-[28px] border border-white/10 bg-[var(--color-surface)] p-5"
        role="dialog"
        aria-modal="true"
        :aria-label="kind === 'voice' ? 'Voice mock' : 'Non-voice'"
      >
        <p class="m-0 text-base font-semibold">{{ kind === "voice" ? "Voice mock" : "Non-voice" }}</p>
        <p class="mb-0 mt-1 text-sm text-[var(--color-text-secondary)]">
          {{ step === "module" ? "Choose a module" : "Choose a level" }}
        </p>

        <div v-if="step === 'module'" class="mt-4 space-y-2">
          <button
            v-for="mode in MODE_KEYS"
            :key="mode"
            type="button"
            class="w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold"
            :class="
              selectedMode === mode
                ? 'bg-[var(--color-accent)] text-white'
                : 'secondary-button'
            "
            @click="chooseModule(mode)"
          >
            {{ MODULE_LABEL[mode] }}
          </button>
        </div>

        <div v-else class="mt-4 space-y-2">
          <button
            v-for="level in DIFFICULTY_KEYS"
            :key="level"
            type="button"
            class="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold disabled:opacity-45"
            :class="
              selectedLevel === level
                ? 'bg-[var(--color-accent)] text-white'
                : 'secondary-button'
            "
            :disabled="!selectedMode || questionCount(selectedMode, level) === 0"
            @click="selectedLevel = level"
          >
            <span>{{ LEVEL_LABEL[level] }}</span>
            <span class="text-xs font-normal">
              {{ selectedMode ? questionCount(selectedMode, level) : 0 }}
            </span>
          </button>
        </div>

        <div class="mt-4 flex gap-2">
          <button
            v-if="step === 'level'"
            type="button"
            class="pill-button secondary-button flex-1 px-4 py-3 text-sm"
            @click="step = 'module'"
          >
            Back
          </button>
          <button
            type="button"
            class="pill-button primary-button flex-1 px-4 py-3 text-sm font-semibold disabled:opacity-45"
            :disabled="!canContinue"
            @click="onPrimary"
          >
            {{ primaryLabel }}
          </button>
        </div>
      </div>
      </div>
    </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.popup-enter-active .popup-backdrop,
.popup-leave-active .popup-backdrop {
  transition: opacity 0.28s ease;
}

.popup-enter-active .popup-panel,
.popup-leave-active .popup-panel {
  transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.38s ease;
}

.popup-enter-from .popup-backdrop,
.popup-leave-to .popup-backdrop {
  opacity: 0;
}

.popup-enter-from .popup-panel,
.popup-leave-to .popup-panel {
  opacity: 0;
  transform: translateY(28px);
}
</style>
