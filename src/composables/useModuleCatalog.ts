import { computed } from "vue";
import type { FunctionalComponent, HTMLAttributes, VNodeProps } from "vue";
import {
  BeakerIcon,
  CloudIcon,
  CodeBracketSquareIcon,
  CommandLineIcon,
  PuzzlePieceIcon,
  ServerStackIcon,
  SparklesIcon,
  UserGroupIcon
} from "@heroicons/vue/24/outline";

type HeroIcon = FunctionalComponent<HTMLAttributes & VNodeProps>;
import { useBanksStore } from "../stores/useBanksStore";
import type { DifficultyKey, ModeKey } from "../types/interview";
import { DIFFICULTY_KEYS } from "../types/interview";

export interface ModuleSectionCard {
  key: string;
  label: string;
  count: number;
  difficulty?: DifficultyKey;
  icon: HeroIcon;
  iconClass: string;
}

export interface ModuleSection {
  mode: ModeKey;
  title: string;
  cards: ModuleSectionCard[];
}

const SECTION_META: Record<
  ModeKey,
  { title: string; sectionIcon: HeroIcon; sectionIconClass: string }
> = {
  basics: {
    title: "Basics",
    sectionIcon: UserGroupIcon,
    sectionIconClass: "bg-violet-500/20 text-violet-200"
  },
  frontend: {
    title: "Frontend",
    sectionIcon: CodeBracketSquareIcon,
    sectionIconClass: "bg-sky-500/20 text-sky-200"
  },
  backend: {
    title: "Backend",
    sectionIcon: ServerStackIcon,
    sectionIconClass: "bg-amber-500/20 text-amber-200"
  },
  infrastructure: {
    title: "Infrastructure",
    sectionIcon: CloudIcon,
    sectionIconClass: "bg-emerald-500/20 text-emerald-200"
  },
  scenario: {
    title: "Scenario based",
    sectionIcon: PuzzlePieceIcon,
    sectionIconClass: "bg-rose-500/20 text-rose-200"
  }
};

const DIFFICULTY_META: Record<
  DifficultyKey,
  { label: string; icon: HeroIcon; iconClass: string }
> = {
  easy: {
    label: "Easy",
    icon: SparklesIcon,
    iconClass: "bg-white/10 text-white"
  },
  intermediate: {
    label: "Intermediate",
    icon: CommandLineIcon,
    iconClass: "bg-sky-500/20 text-sky-200"
  },
  advanced: {
    label: "Advanced",
    icon: BeakerIcon,
    iconClass: "bg-orange-500/20 text-orange-200"
  }
};

export function useModuleCatalog() {
  const banksStore = useBanksStore();

  const sections = computed<ModuleSection[]>(() => {
    if (!banksStore.banks) return [];

    return (Object.keys(SECTION_META) as ModeKey[]).map((mode) => {
      const bank = banksStore.banks![mode];
      const meta = SECTION_META[mode];

      if (mode === "basics") {
        return {
          mode,
          title: meta.title,
          cards: [
            {
              key: "basics-all",
              label: "HR & behavioral",
              count: bank.questions.length,
              icon: meta.sectionIcon,
              iconClass: meta.sectionIconClass
            }
          ]
        };
      }

      const cards = DIFFICULTY_KEYS.map((difficulty) => {
        const diffMeta = DIFFICULTY_META[difficulty];
        const count = bank.questions.filter((q) => q.difficulty === difficulty).length;
        return {
          key: `${mode}-${difficulty}`,
          label: diffMeta.label,
          count,
          difficulty,
          icon: diffMeta.icon,
          iconClass: diffMeta.iconClass
        };
      });

      return {
        mode,
        title: meta.title,
        cards
      };
    });
  });

  return { sections, banksStore };
}
