import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { InterviewQuestion, ModeKey, SessionState, SummaryRecord } from "../types/interview";
import { isModeKey, MODE_KEYS } from "../types/interview";

type EditFile = {
  updatedAt: Partial<Record<ModeKey, number>>;
  questions: Partial<Record<ModeKey, InterviewQuestion[]>>;
};

type SessionRow = {
  data: SessionState | null;
  updated_at: number;
};

type SummaryRow = {
  data: SummaryRecord;
  completed_at: number;
};

type EditRow = {
  mode: string;
  questions: InterviewQuestion[];
  updated_at: number;
};

const MISSING_TABLE =
  "Database tables are not created yet. In Supabase, open SQL Editor, paste supabase/schema.sql, and run it.";

let userId: string | null = null;
let channel: RealtimeChannel | null = null;
let runId = 0;
let syncChain: Promise<void> = Promise.resolve();
let applying = false;
let onlineBound = false;
let ignoreClearedSessionAt = 0;
let onStatus: (message: string) => void = () => {};

export function setSyncStatusHandler(handler: (message: string) => void) {
  onStatus = handler;
}

function report(error: { message?: string; code?: string } | null) {
  if (!error) return;
  const message = error.message || "Sync failed.";
  if (error.code === "PGRST205" || /schema cache|could not find the table/i.test(message)) {
    onStatus(MISSING_TABLE);
    return;
  }
  onStatus(message);
}

export function pushActiveSession(session: SessionState | null) {
  if (!userId || applying) return Promise.resolve();
  const updatedAt = session?.updatedAt ?? Date.now();
  if (!session) ignoreClearedSessionAt = updatedAt;
  return supabase
    .from("active_sessions")
    .upsert({
      user_id: userId,
      data: session,
      updated_at: updatedAt
    })
    .then(({ error }) => report(error));
}

export function pushSummary(summary: SummaryRecord) {
  if (!userId || applying) return Promise.resolve();
  return supabase
    .from("summaries")
    .upsert({
      user_id: userId,
      session_id: summary.sessionId,
      data: summary,
      completed_at: summary.completedAt
    })
    .then(({ error }) => report(error));
}

export function pushBankMode(mode: ModeKey, questions: InterviewQuestion[], updatedAt: number) {
  if (!userId || applying) return Promise.resolve();
  return supabase
    .from("bank_edits")
    .upsert({
      user_id: userId,
      mode,
      questions,
      updated_at: updatedAt
    })
    .then(({ error }) => report(error));
}

export function stopSync() {
  runId += 1;
  userId = null;
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
}

export function startSync(id: string) {
  const token = ++runId;
  userId = id;
  bindOnline();
  syncChain = syncChain
    .catch(() => undefined)
    .then(async () => {
      if (token !== runId) return;
      const ok = await mergeFromCloud(id);
      if (token !== runId || !ok) return;
      subscribe(id);
    });
  return syncChain;
}

function bindOnline() {
  if (onlineBound || typeof window === "undefined") return;
  onlineBound = true;
  window.addEventListener("online", () => {
    if (userId) void startSync(userId);
  });
}

async function mergeFromCloud(id: string) {
  const [{ useSessionStore }, { useBanksStore }, persistence] = await Promise.all([
    import("../stores/useSessionStore"),
    import("../stores/useBanksStore"),
    import("../composables/useSessionPersistence")
  ]);

  const [sessionRes, summaryRes, editsRes] = await Promise.all([
    supabase.from("active_sessions").select("data, updated_at").eq("user_id", id).maybeSingle(),
    supabase
      .from("summaries")
      .select("data, completed_at")
      .eq("user_id", id)
      .order("completed_at", { ascending: false })
      .limit(20),
    supabase.from("bank_edits").select("mode, questions, updated_at").eq("user_id", id)
  ]);

  const firstError = sessionRes.error || summaryRes.error || editsRes.error;
  if (firstError) {
    report(firstError);
    return false;
  }

  const sessionStore = useSessionStore();
  const banksStore = useBanksStore();
  const previousUser = localStorage.getItem("prepmate-sync-user");
  const replaceLocal = Boolean(previousUser && previousUser !== id);

  const remoteSession = (sessionRes.data as SessionRow | null)?.data ?? null;
  const localSession = replaceLocal ? null : persistence.readActiveSession();
  let nextSession = remoteSession;
  let pushSession = false;
  if (!replaceLocal) {
    if (localSession && (!remoteSession || localSession.updatedAt > remoteSession.updatedAt)) {
      nextSession = localSession;
      pushSession = true;
    }
  }

  const remoteSummaries = ((summaryRes.data || []) as SummaryRow[]).map((row) => row.data);
  const localSummaries = replaceLocal ? [] : persistence.readSummaryList();
  const summaryMap = new Map<string, SummaryRecord>();
  for (const item of remoteSummaries) summaryMap.set(item.sessionId, item);
  const summariesToPush: SummaryRecord[] = [];
  for (const item of localSummaries) {
    const existing = summaryMap.get(item.sessionId);
    if (!existing || item.completedAt > existing.completedAt) {
      summaryMap.set(item.sessionId, item);
      summariesToPush.push(item);
    }
  }
  const summaries = [...summaryMap.values()]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 20);

  const localEdits = replaceLocal
    ? { updatedAt: {}, questions: {} }
    : banksStore.getEditFile();
  const nextEdits: EditFile = {
    updatedAt: { ...localEdits.updatedAt },
    questions: { ...localEdits.questions }
  };
  const editsToPush: ModeKey[] = [];
  const remoteEdits = new Map<ModeKey, EditRow>();
  for (const row of (editsRes.data || []) as EditRow[]) {
    if (isModeKey(row.mode)) remoteEdits.set(row.mode, row);
  }

  if (replaceLocal) {
    nextEdits.updatedAt = {};
    nextEdits.questions = {};
    for (const [mode, row] of remoteEdits) {
      nextEdits.questions[mode] = row.questions;
      nextEdits.updatedAt[mode] = row.updated_at;
    }
  } else {
    for (const mode of MODE_KEYS) {
      const remote = remoteEdits.get(mode);
      const localQuestions = localEdits.questions[mode];
      const localAt = localEdits.updatedAt[mode] ?? 0;
      if (localQuestions && !remote) {
        if (!localAt) nextEdits.updatedAt[mode] = Date.now();
        editsToPush.push(mode);
        continue;
      }
      if (localQuestions && remote && localAt > remote.updated_at) {
        editsToPush.push(mode);
        continue;
      }
      if (remote) {
        nextEdits.questions[mode] = remote.questions;
        nextEdits.updatedAt[mode] = remote.updated_at;
      }
    }
  }

  applying = true;
  try {
    sessionStore.applyCloudState(nextSession, summaries);
    banksStore.replaceEdits(nextEdits);
    localStorage.setItem("prepmate-sync-user", id);
  } finally {
    applying = false;
  }

  onStatus("");
  if (pushSession) await pushActiveSession(nextSession);
  for (const summary of summariesToPush) await pushSummary(summary);
  for (const mode of editsToPush) {
    const questions = nextEdits.questions[mode];
    if (questions) await pushBankMode(mode, questions, nextEdits.updatedAt[mode] ?? Date.now());
  }
  return true;
}

function subscribe(id: string) {
  if (channel) void supabase.removeChannel(channel);

  channel = supabase
    .channel(`prepmate-${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "active_sessions", filter: `user_id=eq.${id}` },
      (payload) => {
        void import("../stores/useSessionStore").then(({ useSessionStore }) => {
          const store = useSessionStore();
          if (payload.eventType === "DELETE") {
            store.applyRemoteSession(null, Number.MAX_SAFE_INTEGER);
            return;
          }
          const row = payload.new as SessionRow;
          if (!row?.data && row?.updated_at === ignoreClearedSessionAt) return;
          store.applyRemoteSession(row.data ?? null, row.updated_at ?? 0);
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "summaries", filter: `user_id=eq.${id}` },
      (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new as SummaryRow;
        if (!row?.data) return;
        void import("../stores/useSessionStore").then(({ useSessionStore }) => {
          useSessionStore().applyRemoteSummary(row.data);
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bank_edits", filter: `user_id=eq.${id}` },
      (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new as EditRow;
        const mode = row.mode;
        if (!isModeKey(mode)) return;
        void import("../stores/useBanksStore").then(({ useBanksStore }) => {
          useBanksStore().applyRemoteMode(mode, row.questions || [], row.updated_at || 0);
        });
      }
    )
    .subscribe();
}
