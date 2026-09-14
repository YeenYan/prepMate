import type { SessionState, SummaryRecord } from "../types/interview";

const ACTIVE_SESSION_KEY = "prepmate-active-session";
const LAST_SUMMARY_KEY = "prepmate-last-summary";
const SUMMARY_LIST_KEY = "prepmate-summaries";

export function saveActiveSession(session: SessionState) {
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

export function readActiveSession(): SessionState | null {
  const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export function clearActiveSession() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

export function saveSummary(summary: SummaryRecord) {
  localStorage.setItem(LAST_SUMMARY_KEY, JSON.stringify(summary));
  const current = readSummaryList();
  const next = [summary, ...current.filter((item) => item.sessionId !== summary.sessionId)].slice(
    0,
    20
  );
  localStorage.setItem(SUMMARY_LIST_KEY, JSON.stringify(next));
}

export function readLastSummary(): SummaryRecord | null {
  const raw = localStorage.getItem(LAST_SUMMARY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SummaryRecord;
  } catch {
    return null;
  }
}

export function readSummaryList(): SummaryRecord[] {
  const raw = localStorage.getItem(SUMMARY_LIST_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SummaryRecord[];
  } catch {
    return [];
  }
}
