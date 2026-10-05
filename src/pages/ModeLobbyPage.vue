<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { PencilSquareIcon, TrashIcon } from "@heroicons/vue/24/outline";
import { useBanksStore } from "../stores/useBanksStore";
import type { DifficultyKey, InterviewQuestion, ModeKey } from "../types/interview";
import { DIFFICULTY_KEYS, isModeKey } from "../types/interview";

const route = useRoute();
const banksStore = useBanksStore();

const selectedDifficulty = ref<DifficultyKey>("easy");
const openQuestion = ref<InterviewQuestion | null>(null);
const editing = ref(false);
const draftQuestion = ref("");
const draftAnswer = ref("");
const confirmDelete = ref(false);

const mode = computed<ModeKey | null>(() => {
  const value = String(route.params.mode || "");
  return isModeKey(value) ? value : null;
});

const needsDifficulty = computed(() => Boolean(mode.value && mode.value !== "basics"));
const bank = computed(() => (mode.value ? banksStore.getBank(mode.value) : null));

const difficultyCounts = computed(() => {
  if (!bank.value || !needsDifficulty.value) return [];
  return DIFFICULTY_KEYS.map((difficulty) => ({
    difficulty,
    count: bank.value?.questions.filter((question) => question.difficulty === difficulty).length || 0
  }));
});

const visibleQuestions = computed(() => {
  if (!bank.value) return [];
  if (!needsDifficulty.value) return bank.value.questions;
  return bank.value.questions.filter((question) => question.difficulty === selectedDifficulty.value);
});

onMounted(() => {
  banksStore.init();
});

watch(
  () => String(route.query.difficulty || ""),
  (value) => {
    if (value === "easy" || value === "intermediate" || value === "advanced") {
      selectedDifficulty.value = value;
    }
  },
  { immediate: true }
);

function openDrawer(question: InterviewQuestion) {
  openQuestion.value = question;
  editing.value = false;
  confirmDelete.value = false;
}

function closeDrawer() {
  openQuestion.value = null;
  editing.value = false;
  confirmDelete.value = false;
}

function startEdit() {
  if (!openQuestion.value) return;
  draftQuestion.value = openQuestion.value.question;
  draftAnswer.value = openQuestion.value.sampleAnswer;
  editing.value = true;
}

function saveEdit() {
  if (!mode.value || !openQuestion.value) return;
  const question = draftQuestion.value.trim();
  const sampleAnswer = draftAnswer.value.trim();
  if (!question || !sampleAnswer) return;
  const id = openQuestion.value.id;
  banksStore.updateQuestion(mode.value, id, question, sampleAnswer);
  openQuestion.value = bank.value?.questions.find((item) => item.id === id) || null;
  editing.value = false;
}

function confirmRemove() {
  if (!mode.value || !openQuestion.value) return;
  banksStore.deleteQuestion(mode.value, openQuestion.value.id);
  closeDrawer();
}
</script>

<template>
  <section class="flex min-h-full flex-1 flex-col space-y-5 pt-2">
    <div>
      <h1 class="m-0 text-xl font-semibold tracking-[-0.02em]">{{ bank?.title || "Mode" }}</h1>
      <p class="mb-0 mt-1 text-sm text-[var(--color-text-secondary)]">
        {{ bank?.description || "Select a mode to begin." }}
      </p>
      <p class="mb-0 mt-2 text-sm text-[var(--color-text-secondary)]">
        {{ bank?.questions.length || 0 }} questions in this bank
      </p>
    </div>

    <div v-if="needsDifficulty" class="flex gap-2">
      <button
        v-for="item in difficultyCounts"
        :key="item.difficulty"
        type="button"
        class="relative min-w-0 flex-1 rounded-full px-3 py-2.5 text-center text-sm"
        :class="
          selectedDifficulty === item.difficulty
            ? 'bg-white/12 font-semibold shadow-sm'
            : 'bg-white/5 text-[var(--color-text-secondary)]'
        "
        @click="selectedDifficulty = item.difficulty"
      >
        <span class="capitalize">{{ item.difficulty }}</span>
        <span
          class="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white"
        >
          {{ item.count }}
        </span>
      </button>
    </div>

    <div class="-mx-4 flex-1 bg-[var(--color-surface)] pb-28">
      <button
        v-for="(question, index) in visibleQuestions"
        :key="question.id"
        type="button"
        class="w-full px-6 py-5 text-left"
        :class="index < visibleQuestions.length - 1 ? 'border-b border-white/10' : ''"
        @click="openDrawer(question)"
      >
        <p class="m-0 text-xs text-[var(--color-text-secondary)]">{{ question.category }}</p>
        <p class="mb-0 mt-1.5 text-sm leading-relaxed text-[var(--color-text-primary)]">
          {{ question.question }}
        </p>
      </button>
      <p v-if="!visibleQuestions.length" class="m-0 px-6 py-5 text-sm text-[var(--color-text-secondary)]">
        No questions in this tab yet.
      </p>
    </div>

    <p v-if="!mode" class="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
      Invalid mode route.
    </p>

    <Transition name="drawer">
      <div v-if="openQuestion" class="fixed inset-0 z-[70] flex items-end">
      <button class="absolute inset-0 bg-black/35" aria-label="Close" @click="closeDrawer"></button>
      <div
        class="drawer-sheet relative flex h-[85vh] w-full flex-col overflow-y-auto rounded-t-[28px] border border-white/10 bg-[var(--color-surface)]/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl"
      >
        <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20"></div>
        <div class="flex items-start justify-between gap-3">
          <p v-if="!editing" class="m-0 text-base font-semibold leading-snug">
            {{ openQuestion.question }}
          </p>
          <p v-else class="m-0 text-base font-semibold">Edit</p>
          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
              aria-label="Edit question"
              @click="startEdit"
            >
              <PencilSquareIcon class="h-5 w-5" />
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 text-red-300"
              aria-label="Remove question"
              @click="confirmDelete = true"
            >
              <TrashIcon class="h-5 w-5" />
            </button>
          </div>
        </div>

        <div v-if="editing" class="mt-4 space-y-3">
          <label class="block text-xs text-[var(--color-text-secondary)]">
            Question
            <textarea v-model="draftQuestion" class="soft-input mt-1 min-h-20 w-full p-3 text-sm" />
          </label>
          <label class="block text-xs text-[var(--color-text-secondary)]">
            Answer
            <textarea v-model="draftAnswer" class="soft-input mt-1 min-h-32 w-full p-3 text-sm" />
          </label>
          <div class="flex gap-2">
            <button type="button" class="pill-button secondary-button flex-1 px-4 py-3 text-sm" @click="editing = false">
              Cancel
            </button>
            <button type="button" class="pill-button primary-button flex-1 px-4 py-3 text-sm font-semibold" @click="saveEdit">
              Save
            </button>
          </div>
        </div>
        <p
          v-else
          class="mb-0 mt-4 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm leading-relaxed text-[var(--color-text-primary)]"
        >
          {{ openQuestion.sampleAnswer }}
        </p>
      </div>
      </div>
    </Transition>

    <div v-if="confirmDelete" class="fixed inset-0 z-[80] flex items-center justify-center px-6">
      <button class="absolute inset-0 bg-black/40" aria-label="Cancel delete" @click="confirmDelete = false"></button>
      <div class="relative w-full max-w-sm rounded-[28px] border border-white/10 bg-[var(--color-surface)] p-5">
        <p class="m-0 text-base font-semibold">Delete this question?</p>
        <p class="mb-0 mt-2 text-sm text-[var(--color-text-secondary)]">
          This removes the question and its answer.
        </p>
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="pill-button secondary-button flex-1 px-4 py-3 text-sm"
            @click="confirmDelete = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="pill-button flex-1 bg-red-500 px-4 py-3 text-sm font-semibold text-white"
            @click="confirmRemove"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.drawer-enter-active .drawer-sheet,
.drawer-leave-active .drawer-sheet {
  transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.drawer-enter-from .drawer-sheet,
.drawer-leave-to .drawer-sheet {
  transform: translateY(100%);
}
</style>
