import backendRaw from "../data/backend.json";
import basicsRaw from "../data/basics.json";
import coachRaw from "../data/coach-knowledge.json";
import frontendRaw from "../data/frontend.json";
import infrastructureRaw from "../data/infrastructure.json";
import scenarioRaw from "../data/scenario.json";
import type {
  CoachKnowledge,
  DifficultyKey,
  InterviewQuestion,
  ModeBank,
  ModeKey,
  RawModeBank
} from "../types/interview";
import { isDifficultyKey } from "../types/interview";

const FILE_BY_MODE: Record<ModeKey, string> = {
  basics: "basics.json",
  frontend: "frontend.json",
  backend: "backend.json",
  infrastructure: "infrastructure.json",
  scenario: "scenario.json"
};

const RAW_BANKS: Record<ModeKey, RawModeBank> = {
  basics: basicsRaw as RawModeBank,
  frontend: frontendRaw as RawModeBank,
  backend: backendRaw as RawModeBank,
  infrastructure: infrastructureRaw as RawModeBank,
  scenario: scenarioRaw as RawModeBank
};

function normalizeQuestion(raw: Record<string, unknown>, mode: ModeKey): InterviewQuestion {
  const id = String(raw.id || "").trim();
  const question = String(raw.question || "").trim();
  const sampleAnswer = String(raw.sampleAnswer || raw.referenceAnswer || raw.answer || "").trim();
  const fileName = FILE_BY_MODE[mode];

  if (!id) throw new Error(`${fileName}: question id is missing`);
  if (!question) throw new Error(`${fileName}: question text is missing for id "${id}"`);
  if (!sampleAnswer) {
    throw new Error(`${fileName}: sampleAnswer is missing for id "${id}"`);
  }
  if (sampleAnswer.length < 40) {
    throw new Error(`${fileName}: sampleAnswer too short for id "${id}"`);
  }

  const getStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => String(entry || "").trim())
      .filter((entry) => entry.length > 0);
  };

  const difficultyRaw = String(raw.difficulty || "").trim();
  const difficulty =
    mode !== "basics" && isDifficultyKey(difficultyRaw) ? difficultyRaw : undefined;

  if (mode !== "basics" && !difficulty) {
    throw new Error(`${fileName}: difficulty must be easy|intermediate|advanced for id "${id}"`);
  }

  return {
    id,
    category: String(raw.category || "General").trim() || "General",
    difficulty,
    question,
    sampleAnswer,
    keyPoints: getStringArray(raw.keyPoints),
    hints: getStringArray(raw.hints),
    followUps: getStringArray(raw.followUps),
    tags: getStringArray(raw.tags),
    voicePrompt: String(raw.voicePrompt || question).trim() || question
  };
}

function normalizeBank(mode: ModeKey, raw: RawModeBank): ModeBank {
  if (!raw || typeof raw !== "object") {
    throw new Error(`${FILE_BY_MODE[mode]}: file is not a valid JSON object`);
  }
  if (!Array.isArray(raw.questions)) {
    throw new Error(`${FILE_BY_MODE[mode]}: "questions" must be an array`);
  }

  return {
    mode,
    title: String(raw.title || mode).trim() || mode,
    description: String(raw.description || "").trim(),
    questions: raw.questions.map((question) =>
      normalizeQuestion(question as unknown as Record<string, unknown>, mode)
    )
  };
}

export function loadBank(mode: ModeKey): ModeBank {
  return normalizeBank(mode, RAW_BANKS[mode]);
}

export function loadAllBanks(): Record<ModeKey, ModeBank> {
  return {
    basics: loadBank("basics"),
    frontend: loadBank("frontend"),
    backend: loadBank("backend"),
    infrastructure: loadBank("infrastructure"),
    scenario: loadBank("scenario")
  };
}

export function filterBankByDifficulty(
  bank: ModeBank,
  difficulty?: DifficultyKey
): ModeBank {
  if (!difficulty || bank.mode === "basics") return bank;
  return {
    ...bank,
    questions: bank.questions.filter((question) => question.difficulty === difficulty)
  };
}

export function loadCoachKnowledge(): CoachKnowledge {
  const raw = coachRaw as CoachKnowledge;
  if (!raw.persona?.name || !raw.scoringRubric?.length) {
    throw new Error("coach-knowledge.json: invalid coach knowledge structure");
  }
  return raw;
}
