<script setup lang="ts">
	import { ref } from "vue";
	import { useAuthStore } from "../stores/useAuthStore";

	const auth = useAuthStore();
	const mode = ref<"sign-in" | "sign-up">("sign-in");
	const email = ref("");
	const password = ref("");

	async function submit() {
		if (password.value.length < 6) {
			auth.error = "Use at least 6 characters for the password.";
			return;
		}
		if (mode.value === "sign-in") await auth.signIn(email.value, password.value);
		else await auth.signUp(email.value, password.value);
	}
</script>

<template>
	<section class="flex flex-1 flex-col justify-center px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
		<p v-if="!auth.ready" class="m-0 text-sm text-[var(--color-text-secondary)]">Connecting…</p>
		<div v-else class="module-card mx-auto w-full max-w-md space-y-4">
			<div>
				<p class="m-0 text-sm text-[var(--color-text-secondary)]">PrepMate</p>
				<h1 class="mb-0 mt-1 text-2xl font-semibold">
					{{ mode === "sign-in" ? "Sign in" : "Create account" }}
				</h1>
				<p class="mb-0 mt-2 text-sm text-[var(--color-text-secondary)]">
					Use the same email and password on your phone and computer. Question edits, sessions, and
					summaries stay in sync.
				</p>
			</div>

			<form class="space-y-3" @submit.prevent="submit">
				<label class="block text-sm">
					<span class="mb-1 block text-[var(--color-text-secondary)]">Email</span>
					<input
						v-model="email"
						type="email"
						required
						autocomplete="email"
						class="soft-input w-full px-3 py-3 text-sm outline-none"
					/>
				</label>
				<label class="block text-sm">
					<span class="mb-1 block text-[var(--color-text-secondary)]">Password</span>
					<input
						v-model="password"
						type="password"
						required
						minlength="6"
						:autocomplete="mode === 'sign-in' ? 'current-password' : 'new-password'"
						class="soft-input w-full px-3 py-3 text-sm outline-none"
					/>
				</label>
				<p v-if="auth.error" class="m-0 text-sm text-red-300">{{ auth.error }}</p>
				<p v-if="auth.notice" class="m-0 text-sm text-[var(--color-text-secondary)]">{{ auth.notice }}</p>
				<button
					type="submit"
					class="primary-button w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
					:disabled="auth.pending"
				>
					{{ auth.pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account" }}
				</button>
			</form>

			<button
				type="button"
				class="m-0 border-0 bg-transparent p-0 text-sm text-[#c5d2ff]"
				@click="mode = mode === 'sign-in' ? 'sign-up' : 'sign-in'"
			>
				{{ mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in" }}
			</button>
		</div>
	</section>
</template>
