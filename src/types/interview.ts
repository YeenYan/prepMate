export type ModeKey = "basics" | "frontend" | "backend" | "infrastructure" | "scenario";

export type DifficultyKey = "easy" | "intermediate" | "advanced";

export const MODE_KEYS: ModeKey[] = [
  "basics",
  "frontend",
  "backend",
  "infrastructure",
  "scenario"
];

export const DIFFICULTY_KEYS: DifficultyKey[] = ["easy", "intermediate", "advanced"];

export function isModeKey(value: string): value is ModeKey {
  return (MODE_KEYS as string[]).includes(value);
}

export function isDifficultyKey(value: string): value is DifficultyKey {
  return (DIFFICULTY_KEYS as string[]).includes(value);
}

export interface RawQuestion {
  id: string;
  category?: string;
  difficulty?: string;
  question: string;
  sampleAnswer?: string;
  referenceAnswer?: string;
  answer?: string;
  keyPoints?: string[];
  hints?: string[];
  followUps?: string[];
  tags?: string[];
  voicePrompt?: string;
}

export interface InterviewQuestion {
  id: string;
  category: string;
  difficulty?: DifficultyKey;
  question: string;
  sampleAnswer: string;
  keyPoints: string[];
  hints: string[];
  followUps: string[];
  tags: string[];
  voicePrompt: string;
}

export interface RawModeBank {
  mode: string;
  title: string;
  description: string;
  questions: RawQuestion[];
}

export interface ModeBank {
  mode: ModeKey;
  title: string;
  description: string;
  questions: InterviewQuestion[];
}

export interface ScoringRubricItem {
  id: "coverage" | "accuracy" | "clarity" | string;
  weight: number;
  description: string;
}

export interface CoachKnowledge {
  persona: {
    name: string;
    voiceStyle: string;
    greeting: string;
  };
  scoringRubric: ScoringRubricItem[];
  feedbackTemplates: {
    high: string[];
    mid: string[];
    low: string[];
  };
  insights: Array<{
    id: string;
    tags: string[];
    guidance: string;
  }>;
  conversation: {
    askNext: string[];
    encourage: string[];
    correct: string[];
  };
}

export interface ScoreResult {
  score: number;
  label: "Needs work" | "Getting there" | "Solid" | "Interview ready";
  covered: string[];
  missing: string[];
  wrong: string[];
  suggestion: string;
  improvedOutline: string[];
}

export interface SessionAnswer {
  questionId: string;
  question: string;
  sampleAnswer: string;
  userAnswer: string;
  score: number;
  feedback: string;
  covered: string[];
  missing: string[];
  wrong: string[];
  skipped: boolean;
}

export interface SessionState {
  sessionId: string;
  mode: ModeKey;
  difficulty?: DifficultyKey;
  queue: InterviewQuestion[];
  currentIndex: number;
  status: "idle" | "answering" | "feedback" | "stopped" | "completed";
  answers: SessionAnswer[];
  startedAt: number;
  updatedAt: number;
}

export interface SummaryRecord {
  sessionId: string;
  mode: ModeKey;
  difficulty?: DifficultyKey;
  averageScore: number;
  answeredCount: number;
  skippedCount: number;
  remainingCount: number;
  bestScore: number;
  weakestQuestion: string;
  completedAt: number;
  answers: SessionAnswer[];
}
