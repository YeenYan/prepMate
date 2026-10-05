import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "src", "data");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
}

/** @type {Record<string, { mode: string, difficulty: string, category?: string }>} */
const MAP = {
  // Easy → Frontend
  "easy-001": { mode: "frontend", difficulty: "easy" },
  "easy-002": { mode: "frontend", difficulty: "easy" },
  "easy-003": { mode: "frontend", difficulty: "easy" },
  "easy-005": { mode: "frontend", difficulty: "easy" },
  "easy-006": { mode: "frontend", difficulty: "easy" },
  "easy-008": { mode: "frontend", difficulty: "easy" },
  "easy-009": { mode: "frontend", difficulty: "easy" },
  "easy-010": { mode: "frontend", difficulty: "easy" },
  "easy-011": { mode: "frontend", difficulty: "easy" },
  "easy-013": { mode: "frontend", difficulty: "easy" },
  "easy-016": { mode: "frontend", difficulty: "easy" },
  "easy-017": { mode: "frontend", difficulty: "easy" },
  "easy-018": { mode: "frontend", difficulty: "easy" },
  "easy-019": { mode: "frontend", difficulty: "easy" },
  "easy-020": { mode: "frontend", difficulty: "easy" },
  "easy-023": { mode: "frontend", difficulty: "easy" },

  // Easy → Backend
  "easy-004": { mode: "backend", difficulty: "easy" },
  "easy-012": { mode: "backend", difficulty: "easy" },
  "easy-014": { mode: "backend", difficulty: "easy" },

  // Easy → Infrastructure
  "easy-007": { mode: "infrastructure", difficulty: "easy" },
  "easy-021": { mode: "infrastructure", difficulty: "easy" },
  "easy-022": { mode: "infrastructure", difficulty: "easy" },

  // Easy → Scenario
  "easy-015": { mode: "scenario", difficulty: "easy" },

  // Intermediate → Frontend
  "intermediate-001": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-002": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-003": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-004": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-005": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-006": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-007": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-008": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-011": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-012": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-016": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-017": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-018": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-019": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-020": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-021": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-022": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-023": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-024": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-026": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-027": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-028": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-029": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-030": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-031": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-032": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-033": { mode: "frontend", difficulty: "intermediate" },
  "intermediate-034": { mode: "frontend", difficulty: "intermediate" },

  // Intermediate → Backend
  "intermediate-009": { mode: "backend", difficulty: "intermediate" },
  "intermediate-025": { mode: "backend", difficulty: "intermediate" },

  // Intermediate → Infrastructure
  "intermediate-013": { mode: "infrastructure", difficulty: "intermediate" },

  // Intermediate → Scenario
  "intermediate-010": { mode: "scenario", difficulty: "intermediate" },
  "intermediate-014": { mode: "scenario", difficulty: "intermediate" },
  "intermediate-015": { mode: "scenario", difficulty: "intermediate" },

  // Advanced → Frontend
  "advanced-003": { mode: "frontend", difficulty: "advanced" },
  "advanced-007": { mode: "frontend", difficulty: "advanced" },
  "advanced-013": { mode: "frontend", difficulty: "advanced" },

  // Advanced → Backend
  "advanced-002": { mode: "backend", difficulty: "advanced" },
  "advanced-004": { mode: "backend", difficulty: "advanced" },
  "advanced-006": { mode: "backend", difficulty: "advanced" },
  "advanced-010": { mode: "backend", difficulty: "advanced" },

  // Advanced → Infrastructure
  "advanced-011": { mode: "infrastructure", difficulty: "advanced" },

  // Advanced → Scenario
  "advanced-001": { mode: "scenario", difficulty: "advanced" },
  "advanced-005": { mode: "scenario", difficulty: "advanced" },
  "advanced-008": { mode: "scenario", difficulty: "advanced" },
  "advanced-009": { mode: "scenario", difficulty: "advanced" },
  "advanced-012": { mode: "scenario", difficulty: "advanced" }
};

const META = {
  frontend: {
    mode: "frontend",
    title: "Frontend",
    description:
      "UI, browser, framework, and client-side interview questions. Pick a difficulty to practice."
  },
  backend: {
    mode: "backend",
    title: "Backend",
    description:
      "APIs, data, services, and server-side interview questions. Pick a difficulty to practice."
  },
  infrastructure: {
    mode: "infrastructure",
    title: "Infrastructure",
    description:
      "Git, tooling, observability, and delivery interview questions. Pick a difficulty to practice."
  },
  scenario: {
    mode: "scenario",
    title: "Scenario Based",
    description:
      "System design, debugging, and situational interview questions. Pick a difficulty to practice."
  }
};

const difficultyOrder = { easy: 0, intermediate: 1, advanced: 2 };

const banks = {
  frontend: { ...META.frontend, questions: [] },
  backend: { ...META.backend, questions: [] },
  infrastructure: { ...META.infrastructure, questions: [] },
  scenario: { ...META.scenario, questions: [] }
};

const counters = {
  frontend: { easy: 0, intermediate: 0, advanced: 0 },
  backend: { easy: 0, intermediate: 0, advanced: 0 },
  infrastructure: { easy: 0, intermediate: 0, advanced: 0 },
  scenario: { easy: 0, intermediate: 0, advanced: 0 }
};

const sources = ["easy.json", "intermediate.json", "advanced.json"];
const seen = new Set();
const unmapped = [];

for (const file of sources) {
  const bank = load(file);
  for (const question of bank.questions) {
    const target = MAP[question.id];
    if (!target) {
      unmapped.push(question.id);
      continue;
    }
    seen.add(question.id);
    counters[target.mode][target.difficulty] += 1;
    const n = String(counters[target.mode][target.difficulty]).padStart(3, "0");
    const prefix =
      target.mode === "infrastructure"
        ? "infra"
        : target.mode === "scenario"
          ? "scenario"
          : target.mode;
    banks[target.mode].questions.push({
      ...question,
      id: `${prefix}-${target.difficulty}-${n}`,
      difficulty: target.difficulty,
      category: target.category || question.category
    });
  }
}

for (const mode of Object.keys(banks)) {
  banks[mode].questions.sort(
    (a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
  );
  fs.writeFileSync(
    path.join(dataDir, `${mode}.json`),
    `${JSON.stringify(banks[mode], null, "\t")}\n`,
    "utf8"
  );
}

// Keep basics as-is but ensure mode field is correct
const basics = load("basics.json");
basics.mode = "basics";
basics.title = "Basics";
basics.description =
  "Behavioral and personal interview questions with adaptable first-person model answers.";
fs.writeFileSync(path.join(dataDir, "basics.json"), `${JSON.stringify(basics, null, "\t")}\n`, "utf8");

for (const file of sources) {
  fs.unlinkSync(path.join(dataDir, file));
}

console.log("Counts by mode/difficulty:");
for (const [mode, byDiff] of Object.entries(counters)) {
  console.log(mode, byDiff, "total", Object.values(byDiff).reduce((a, b) => a + b, 0));
}
console.log("Mapped", seen.size, "questions");
if (unmapped.length) {
  console.error("UNMAPPED", unmapped);
  process.exit(1);
}
const expected = Object.keys(MAP).length;
if (seen.size !== expected) {
  console.error("Expected", expected, "got", seen.size);
  process.exit(1);
}
console.log("Done. Removed easy/intermediate/advanced.json");
