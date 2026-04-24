// 검색 결과 언어 필터: 한국어·영문(라틴)만 허용, 중국어 전용/일본어 가나 제외
import type { SearchCandidate } from "@/types";

const HANGUL = /[\uAC00-\uD7AF]/;
const KANA = /[\u3040-\u309F\u30A0-\u30FF]/;
const CJK_UNIFIED = /[\u4E00-\u9FFF]/;
const LATIN = /[A-Za-z]/;

export function isKoreanQuery(query: string): boolean {
  return HANGUL.test(query);
}

// 한국어 문자 비율 (0.0 ~ 1.0)
export function hangulRatio(text: string): number {
  if (!text) return 0;
  const chars = Array.from(text);
  const total = chars.filter((c) => /\S/.test(c)).length;
  if (total === 0) return 0;
  const hangulCount = chars.filter((c) => HANGUL.test(c)).length;
  return hangulCount / total;
}

// 제목 언어 판정:
// - 한글 포함 → 허용 (한국 도서)
// - 가나(일본어) 포함 → 차단
// - 한자 포함 & 라틴 없음 → 중국어 도서로 차단
// - 그 외 → 라틴(영문) 등으로 허용
export function isAllowedTitle(title: string): boolean {
  if (!title) return false;
  if (HANGUL.test(title)) return true;
  if (KANA.test(title)) return false;
  if (CJK_UNIFIED.test(title) && !LATIN.test(title)) return false;
  return true;
}

// 저자 언어 판정 (한글 번역/로마자 표기 모두 허용, 순수 한자·가나는 차단)
export function isAllowedAuthor(author: string): boolean {
  if (!author) return true; // 저자 누락은 허용
  if (HANGUL.test(author)) return true;
  if (KANA.test(author)) return false;
  if (CJK_UNIFIED.test(author) && !LATIN.test(author)) return false;
  return true;
}

export function filterByLanguage(candidates: SearchCandidate[]): SearchCandidate[] {
  return candidates.filter(
    (c) => isAllowedTitle(c.title) && isAllowedAuthor(c.author)
  );
}
