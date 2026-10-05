<script setup lang="ts">
import { useRouter } from "vue-router";
import ModuleCategoryCard from "./ModuleCategoryCard.vue";
import { useModuleCatalog } from "../composables/useModuleCatalog";
import type { DifficultyKey, ModeKey } from "../types/interview";

const router = useRouter();
const { sections } = useModuleCatalog();

function openCard(mode: ModeKey, difficulty?: DifficultyKey) {
  if (mode === "basics") {
    router.push("/mode/basics");
    return;
  }
  if (difficulty) {
    router.push({ path: `/mode/${mode}`, query: { difficulty } });
    return;
  }
  router.push(`/mode/${mode}`);
}
</script>

<template>
  <div class="space-y-8">
    <section v-for="section in sections" :key="section.mode">
      <h2 class="m-0 mb-3 text-[22px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
        {{ section.title }}
      </h2>

      <div class="grid grid-cols-2 gap-3">
        <ModuleCategoryCard
          v-for="card in section.cards"
          :key="card.key"
          :label="card.label.toUpperCase()"
          :count="card.count"
          :icon="card.icon"
          :icon-class="card.iconClass"
          @click="openCard(section.mode, card.difficulty)"
        />
      </div>
    </section>
  </div>
</template>
