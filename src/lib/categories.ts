import type { Category } from "@/types";

export const OTHER_CATEGORY_NAME = "기타";

const CATEGORY_ALIAS_ENTRIES: Array<[string, string]> = [
  ["소설", "소설"],
  ["fiction", "소설"],
  ["novel", "소설"],
  ["시", "시/에세이"],
  ["에세이", "시/에세이"],
  ["essay", "시/에세이"],
  ["poetry", "시/에세이"],
  ["인문", "인문"],
  ["humanities", "인문"],
  ["philosophy", "인문"],
  ["사회", "사회"],
  ["social science", "사회"],
  ["society", "사회"],
  ["역사", "역사"],
  ["history", "역사"],
  ["과학", "과학"],
  ["science", "과학"],
  ["기술", "기술/공학"],
  ["공학", "기술/공학"],
  ["technology", "기술/공학"],
  ["engineering", "기술/공학"],
  ["프로그래밍", "프로그래밍"],
  ["programming", "프로그래밍"],
  ["software", "프로그래밍"],
  ["computers", "프로그래밍"],
  ["computer", "프로그래밍"],
  ["web development", "프로그래밍"],
  ["경영", "경영/경제"],
  ["경제", "경영/경제"],
  ["business", "경영/경제"],
  ["economics", "경영/경제"],
  ["자기계발", "자기계발"],
  ["self-help", "자기계발"],
  ["예술", "예술"],
  ["art", "예술"],
  ["종교", "종교"],
  ["religion", "종교"],
  ["여행", "여행"],
  ["travel", "여행"],
  ["요리", "요리"],
  ["cooking", "요리"],
  ["건강", "건강"],
  ["health", "건강"],
  ["어린이", "어린이/청소년"],
  ["청소년", "어린이/청소년"],
  ["juvenile", "어린이/청소년"],
  ["만화", "만화"],
  ["comic", "만화"],
  ["잡지", "잡지"],
  ["magazine", "잡지"],
  ["기타", "기타"],
];

const CATEGORY_KEYWORD_ENTRIES: Array<[string, string]> = [
  ["computer", "프로그래밍"],
  ["program", "프로그래밍"],
  ["software", "프로그래밍"],
  ["web", "프로그래밍"],
  ["technology", "기술/공학"],
  ["engineering", "기술/공학"],
  ["business", "경영/경제"],
  ["econom", "경영/경제"],
  ["science", "과학"],
  ["history", "역사"],
  ["travel", "여행"],
  ["cook", "요리"],
  ["health", "건강"],
  ["self-help", "자기계발"],
  ["religion", "종교"],
  ["comic", "만화"],
  ["magazine", "잡지"],
  ["fiction", "소설"],
  ["novel", "소설"],
  ["essay", "시/에세이"],
  ["poetry", "시/에세이"],
];

const CATEGORY_ALIAS_MAP = new Map(
  CATEGORY_ALIAS_ENTRIES.map(([key, value]) => [normalizeCategoryText(key), value])
);

export function normalizeCategoryText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[&,+]/g, " ")
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveCategoryName(
  value: string | null | undefined,
  fallbackName: string | null = OTHER_CATEGORY_NAME
): string | null {
  if (!value?.trim()) return null;

  const normalized = normalizeCategoryText(value);
  const exactMatch = CATEGORY_ALIAS_MAP.get(normalized);
  if (exactMatch) return exactMatch;

  for (const [keyword, resolvedName] of CATEGORY_KEYWORD_ENTRIES) {
    if (normalized.includes(keyword)) {
      return resolvedName;
    }
  }

  return fallbackName;
}

export function resolveCategoryIds(
  value: string | null | undefined,
  categories: Category[],
  fallbackName: string | null = OTHER_CATEGORY_NAME
): string[] {
  const resolvedName = resolveCategoryName(value, fallbackName);
  if (!resolvedName) return [];

  const matched = categories.find((category) => category.name === resolvedName);
  return matched ? [matched.id] : [];
}
