import advancedRaw from "../data/advanced.json";
import basicsRaw from "../data/basics.json";
import coachRaw from "../data/coach-knowledge.json";
import easyRaw from "../data/easy.json";
import intermediateRaw from "../data/intermediate.json";
import type {
  CoachKnowledge,
  InterviewQuestion,
  ModeBank,
  ModeKey,
  RawModeBank
} from "../types/interview";

const FILE_BY_MODE: Record<ModeKey, string> = {
  easy: "easy.json",
  intermediate: "intermediate.json",
  advanced: "advanced.json",
  basics: "basics.json"
};

const RAW_BANKS: Record<ModeKey, RawModeBank> = {
  easy: easyRaw as RawModeBank,
  intermediate: intermediateRaw as RawModeBank,
  advanced: advancedRaw as RawModeBank,
  basics: basicsRaw as RawModeBank
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

  return {
    id,
    category: String(raw.category || "General").trim() || "General",
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
      normalizeQuestion(question as Record<string, unknown>, mode)
    )
  };
}

export function loadBank(mode: ModeKey): ModeBank {
  return normalizeBank(mode, RAW_BANKS[mode]);
}

export function loadAllBanks(): Record<ModeKey, ModeBank> {
  return {
    easy: loadBank("easy"),
    intermediate: loadBank("intermediate"),
    advanced: loadBank("advanced"),
    basics: loadBank("basics")
  };
}

export function loadCoachKnowledge(): CoachKnowledge {
  const raw = coachRaw as CoachKnowledge;
  if (!raw.persona?.name || !raw.scoringRubric?.length) {
    throw new Error("coach-knowledge.json: invalid coach knowledge structure");
  }
  return raw;
}
