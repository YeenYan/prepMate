<script setup lang="ts">
	import { onMounted } from "vue";
	import ModuleSectionsBlock from "../components/ModuleSectionsBlock.vue";
	import { useBanksStore } from "../stores/useBanksStore";

	const banksStore = useBanksStore();

	onMounted(() => {
		banksStore.init();
	});
</script>

<template>
	<section class="pb-32 pt-2">
		<ModuleSectionsBlock />

		<p
			v-if="banksStore.error"
			class="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-300"
		>
			{{ banksStore.error }}
		</p>
	</section>
</template>
