<script setup lang="ts">
	import { computed, onMounted, onUnmounted, ref } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import {
		ArrowLeftIcon,
		ArrowRightOnRectangleIcon,
	} from "@heroicons/vue/24/outline";
	import AppBottomNav from "./components/AppBottomNav.vue";
	import AuthScreen from "./components/AuthScreen.vue";
	import { useAuthStore } from "./stores/useAuthStore";

	const route = useRoute();
	const router = useRouter();
	const auth = useAuthStore();
	const layoutStyle = ref<Record<string, string>>({});

	const title = computed(() => {
		if (route.path.startsWith("/mode/")) return "Mode Lobby";
		if (route.path.startsWith("/session/")) return "Question Session";
		if (route.path === "/mock") return "Mock INTVW";
		if (route.path.startsWith("/mock/")) return "Voice Mock";
		if (route.path.startsWith("/summary/")) return "Grade Summary";
		if (route.path.startsWith("/coach")) return "Coach";
		if (route.path.startsWith("/module")) return "Module";
		return "PrepMate";
	});

	const isParentModule = computed(() => {
		const path = route.path;
		return path === "/mock" || path === "/coach" || path === "/module";
	});
	const showBack = computed(() => route.path !== "/" && !isParentModule.value);
	const showBottomNav = computed(
		() => !route.path.startsWith("/session/") && !route.path.startsWith("/mock/"),
	);

	function syncLayoutViewport() {
		const viewport = window.visualViewport;
		if (!viewport) return;
		layoutStyle.value = {
			height: `${viewport.height}px`,
			top: `${viewport.offsetTop}px`,
		};
	}

	onMounted(() => {
		auth.init();
		syncLayoutViewport();
		window.visualViewport?.addEventListener("resize", syncLayoutViewport);
		window.visualViewport?.addEventListener("scroll", syncLayoutViewport);
		document.getElementById("boot-loader")?.remove();
	});

	onUnmounted(() => {
		window.visualViewport?.removeEventListener("resize", syncLayoutViewport);
		window.visualViewport?.removeEventListener("scroll", syncLayoutViewport);
	});
</script>

<template>
	<div class="app-shell" :style="layoutStyle">
		<AuthScreen v-if="!auth.ready || !auth.signedIn" />

		<header
			v-else
			class="relative z-20 flex items-center justify-between px-4 pb-2 pt-[max(0.8rem,env(safe-area-inset-top))]"
		>
			<button
				v-if="showBack"
				class="pill-button glass h-9 w-9 text-sm"
				aria-label="Go back"
				@click="router.back()"
			>
				<ArrowLeftIcon class="mx-auto h-4 w-4" aria-hidden="true" />
			</button>
			<div v-else class="h-9 w-9"></div>
			<p class="m-0 flex items-baseline gap-1.5 text-sm font-semibold">
				<span>{{ title }}</span>
				<span
					v-if="title === 'PrepMate'"
					class="text-[10px] font-medium tracking-wide text-[var(--color-text-secondary)]"
					>v1.2</span
				>
			</p>
			<button
				class="pill-button glass h-9 w-9 text-sm"
				aria-label="Sign out"
				@click="auth.signOut()"
			>
				<ArrowRightOnRectangleIcon class="mx-auto h-4 w-4" aria-hidden="true" />
			</button>
		</header>

		<main v-if="auth.signedIn" class="scroll-area flex flex-col px-4 pb-2">
			<p
				v-if="auth.syncError"
				class="mb-3 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-300"
			>
				{{ auth.syncError }}
			</p>
			<router-view />
		</main>

		<AppBottomNav v-if="auth.signedIn && showBottomNav" />
	</div>
</template>
