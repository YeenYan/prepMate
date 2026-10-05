import type { CoachKnowledge, InterviewQuestion, ModeBank } from "../types/interview";

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function useCoach(knowledge: CoachKnowledge) {
  function getRelevantInsights(question: InterviewQuestion): string[] {
    const tokens = normalize(`${question.question} ${question.category} ${question.tags.join(" ")}`);
    const matched = knowledge.insights.filter((insight) =>
      insight.tags.some((tag) => tokens.includes(tag.toLowerCase()))
    );
    return (matched.length ? matched : knowledge.insights.slice(0, 2)).map((entry) => entry.guidance);
  }

  function buildSpokenFeedback(params: {
    score: number;
    covered: string[];
    missing: string[];
    suggestion: string;
  }): string {
    const { score, covered, missing, suggestion } = params;
    const templateGroup =
      score >= 85 ? knowledge.feedbackTemplates.high : score >= 50 ? knowledge.feedbackTemplates.mid : knowledge.feedbackTemplates.low;
    const template = pickRandom(templateGroup);
    const text = template
      .replace("{covered}", covered.join(", ") || "the main idea")
      .replace("{missing}", missing.join(", ") || "more specific details")
      .replace("{suggestion}", suggestion)
      .replace("{structure}", "clear opening, 2-3 key points, concrete example");
    return text;
  }

  function answerCoachChat(input: string, banks: ModeBank[]): string {
    const queryTokens = normalize(input);
    const matches: Array<{ question: InterviewQuestion; score: number; mode: string }> = [];

    for (const bank of banks) {
      for (const question of bank.questions) {
        const content = `${question.question} ${question.sampleAnswer} ${question.keyPoints.join(" ")}`;
        const tokens = normalize(content);
        const hitCount = queryTokens.filter((token) => tokens.includes(token)).length;
        if (hitCount > 0) {
          matches.push({ question, score: hitCount, mode: bank.title });
        }
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const top = matches.slice(0, 2);
    if (!top.length) {
      return "I do not have that in my notes yet. Add it to basics.json for HR topics or to frontend/backend/infrastructure/scenario.json for technical topics, then I can coach from it.";
    }

    const lines = top.map(
      (item) =>
        `From ${item.mode}: ${item.question.question}\nModel answer: ${item.question.sampleAnswer}`
    );
    return lines.join("\n\n");
  }

  return {
    persona: knowledge.persona,
    getRelevantInsights,
    buildSpokenFeedback,
    answerCoachChat
  };
}
