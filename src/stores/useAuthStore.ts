import { defineStore } from "pinia";
import { ref } from "vue";
import { setSyncStatusHandler, startSync, stopSync } from "../lib/cloudSync";
import { supabase, supabaseConfigured } from "../lib/supabase";

export const useAuthStore = defineStore("auth", () => {
  const ready = ref(false);
  const signedIn = ref(false);
  const email = ref("");
  const pending = ref(false);
  const error = ref("");
  const notice = ref("");
  const syncError = ref("");
  let started = false;

  function init() {
    if (started) return;
    started = true;
    setSyncStatusHandler((message) => {
      syncError.value = message;
    });
    if (!supabaseConfigured) {
      error.value = "Supabase keys are missing from .env.";
      ready.value = true;
      return;
    }

    supabase.auth.onAuthStateChange((event, session) => {
      signedIn.value = Boolean(session?.user);
      email.value = session?.user.email || "";
      if (event === "SIGNED_OUT") stopSync();
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session?.user) {
        const userId = session.user.id;
        setTimeout(() => {
          void startSync(userId);
        }, 0);
      }
      ready.value = true;
    });

    void supabase.auth.getSession().then(({ data }) => {
      signedIn.value = Boolean(data.session?.user);
      email.value = data.session?.user.email || "";
      ready.value = true;
      if (data.session?.user) {
        const userId = data.session.user.id;
        setTimeout(() => {
          void startSync(userId);
        }, 0);
      }
    });
  }

  async function signIn(nextEmail: string, password: string) {
    error.value = "";
    notice.value = "";
    pending.value = true;
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: nextEmail.trim(),
      password
    });
    pending.value = false;
    if (authError) error.value = authError.message;
  }

  async function signUp(nextEmail: string, password: string) {
    error.value = "";
    notice.value = "";
    pending.value = true;
    const { data, error: authError } = await supabase.auth.signUp({
      email: nextEmail.trim(),
      password
    });
    pending.value = false;
    if (authError) {
      error.value = authError.message;
      return;
    }
    if (!data.session) {
      notice.value = "Check your email and confirm the account, then sign in on this device and your phone.";
    }
  }

  async function signOut() {
    stopSync();
    signedIn.value = false;
    email.value = "";
    syncError.value = "";
    await supabase.auth.signOut();
  }

  return {
    ready,
    signedIn,
    email,
    pending,
    error,
    notice,
    syncError,
    init,
    signIn,
    signUp,
    signOut
  };
});
