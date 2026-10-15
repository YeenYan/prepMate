<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  heading: string;
}>();

const emit = defineEmits<{
  close: [];
  save: [payload: { question: string; sampleAnswer: string }];
}>();

const question = ref("");
const answer = ref("");
const error = ref("");

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    question.value = "";
    answer.value = "";
    error.value = "";
  }
);

function submit() {
  const nextQuestion = question.value.trim();
  const nextAnswer = answer.value.trim();
  if (!nextQuestion || !nextAnswer) {
    error.value = "Add both a question and an answer.";
    return;
  }
  emit("save", { question: nextQuestion, sampleAnswer: nextAnswer });
}
</script>

<template>
  <Transition name="drawer">
    <div v-if="open" class="fixed inset-0 z-[70] flex items-end">
      <button class="absolute inset-0 bg-black/35" aria-label="Close" @click="emit('close')"></button>
      <div
        class="drawer-sheet relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-[28px] border border-white/10 bg-[var(--color-surface)]/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl"
      >
        <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20"></div>
        <p class="m-0 text-base font-semibold">Add question</p>
        <p class="mb-0 mt-1 text-sm capitalize text-[var(--color-text-secondary)]">{{ heading }}</p>

        <div class="mt-4 space-y-3">
          <label class="block text-xs text-[var(--color-text-secondary)]">
            Question
            <textarea v-model="question" class="soft-input mt-1 min-h-20 w-full p-3 text-sm" />
          </label>
          <label class="block text-xs text-[var(--color-text-secondary)]">
            Answer
            <textarea v-model="answer" class="soft-input mt-1 min-h-32 w-full p-3 text-sm" />
          </label>
          <p v-if="error" class="m-0 text-sm text-red-300">{{ error }}</p>
          <div class="flex gap-2">
            <button type="button" class="pill-button secondary-button flex-1 px-4 py-3 text-sm" @click="emit('close')">
              Cancel
            </button>
            <button type="button" class="pill-button primary-button flex-1 px-4 py-3 text-sm font-semibold" @click="submit">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
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
