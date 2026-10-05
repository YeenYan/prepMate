<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import GlassContainer from "../components/GlassContainer.vue";
import { useCoach } from "../composables/useCoach";
import { useBanksStore } from "../stores/useBanksStore";
import { MODE_KEYS } from "../types/interview";

const banksStore = useBanksStore();
const input = ref("");
const messages = ref<Array<{ role: "user" | "coach"; text: string }>>([]);

onMounted(() => {
  banksStore.init();
});

const runtime = computed(() => {
  if (!banksStore.coach || !banksStore.banks) return null;
  return useCoach(banksStore.coach);
});

function ask() {
  if (!input.value.trim() || !runtime.value || !banksStore.banks) return;
  const question = input.value.trim();
  messages.value.push({ role: "user", text: question });
  const reply = runtime.value.answerCoachChat(
    question,
    MODE_KEYS.map((key) => banksStore.banks![key])
  );
  messages.value.push({ role: "coach", text: reply });
  input.value = "";
}
</script>

<template>
  <section class="space-y-4 pb-26">
    <GlassContainer class="rounded-[28px] p-5">
      <h1 class="m-0 text-2xl font-semibold">Coach Notes Chat</h1>
      <p class="mb-0 mt-2 text-sm text-[var(--color-text-secondary)]">
        Answers are retrieved only from your local JSON banks and coach knowledge.
      </p>
    </GlassContainer>

    <GlassContainer class="rounded-[24px] p-4">
      <div class="max-h-[55vh] space-y-2 overflow-y-auto">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap"
          :class="
            message.role === 'coach'
              ? 'bg-white/10 text-[var(--color-text-primary)]'
              : 'ml-8 bg-[var(--color-accent)]/20 text-[var(--color-text-primary)]'
          "
        >
          {{ message.text }}
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <input
          v-model="input"
          class="soft-input min-w-0 flex-1 px-3 py-2 text-sm outline-none"
          placeholder="Ask anything..."
        />
        <button class="pill-button primary-button px-4 py-2 text-sm font-semibold" @click="ask">
          Send
        </button>
      </div>
    </GlassContainer>
  </section>
</template>
