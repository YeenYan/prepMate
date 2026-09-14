import type { CoachKnowledge, InterviewQuestion, ScoreResult } from "../types/interview";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "be",
  "that",
  "this",
  "it",
  "as",
  "by",
  "at",
  "from"
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function tokenOverlapRatio(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) intersection += 1;
  }
  const union = new Set([...aSet, ...bSet]).size;
  return union ? intersection / union : 0;
}

function coverageForPoint(userTokens: string[], point: string): boolean {
  const pointTokens = tokenize(point);
  if (!pointTokens.length) return false;
  const hitCount = pointTokens.filter((token) => userTokens.includes(token)).length;
  return hitCount / pointTokens.length >= 0.5;
}

function contradictionLite(answer: string, keyPoints: string[]): string[] {
  const normalized = normalizeText(answer);
  const wrong: string[] = [];
  for (const keyPoint of keyPoints) {
    const normalizedPoint = normalizeText(keyPoint);
    if (!normalizedPoint) continue;
    const hasNegation =
      normalized.includes(`not ${normalizedPoint}`) ||
      normalized.includes(`no ${normalizedPoint}`) ||
      normalized.includes(`never ${normalizedPoint}`);
    if (hasNegation) wrong.push(keyPoint);
  }
  return wrong;
}

function labelForScore(score: number): ScoreResult["label"] {
  if (score < 40) return "Needs work";
  if (score < 70) return "Getting there";
  if (score < 85) return "Solid";
  return "Interview ready";
}

export function scoreAnswer(
  question: InterviewQuestion,
  userAnswer: string,
  coach: CoachKnowledge
): ScoreResult {
  const userTokens = tokenize(userAnswer);
  const sampleTokens = tokenize(question.sampleAnswer);
  const keyPoints = question.keyPoints.length
    ? question.keyPoints
    : question.sampleAnswer
        .split(".")
        .map((line) => line.trim())
        .filter((line) => line.length > 12)
        .slice(0, 4);

  const covered = keyPoints.filter((point) => coverageForPoint(userTokens, point));
  const missing = keyPoints.filter((point) => !covered.includes(point));
  const wrong = contradictionLite(userAnswer, keyPoints);

  const coverageScore = keyPoints.length ? covered.length / keyPoints.length : 0;
  const lexicalScore = tokenOverlapRatio(userTokens, sampleTokens);
  const lengthScore = Math.min(userAnswer.trim().length / 280, 1);
  const accuracyPenalty = wrong.length ? Math.min(wrong.length * 0.2, 0.5) : 0;

  const coverageWeight =
    coach.scoringRubric.find((item) => item.id === "coverage")?.weight ?? 0.5;
  const accuracyWeight =
    coach.scoringRubric.find((item) => item.id === "accuracy")?.weight ?? 0.3;
  const clarityWeight =
    coach.scoringRubric.find((item) => item.id === "clarity")?.weight ?? 0.2;

  const rawScore =
    coverageScore * coverageWeight +
    Math.max(0, lexicalScore - accuracyPenalty) * accuracyWeight +
    ((lengthScore + lexicalScore) / 2) * clarityWeight;

  let score = Math.round(Math.max(0, Math.min(1, rawScore)) * 100);
  if (userAnswer.trim().length < 45) score = Math.min(score, 45);
  if (userAnswer.trim().length < 20) score = Math.min(score, 20);

  const suggestionBase = missing[0] || "clear structure and concrete examples";
  const improvedOutline = [
    `Open with a direct answer to: ${question.question}`,
    ...keyPoints.slice(0, 3).map((point) => `Include: ${point}`),
    "End with one practical example or impact."
  ].slice(0, 5);

  return {
    score,
    label: labelForScore(score),
    covered,
    missing,
    wrong,
    suggestion: `Add more detail on ${suggestionBase}.`,
    improvedOutline
  };
}
