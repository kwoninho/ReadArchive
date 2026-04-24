// 검색 결과 언어 필터: 한국어·영문(라틴)만 허용, 중국어 전용/일본어 가나 제외
import type { SearchCandidate } from "@/types";

const HANGUL = /[\uAC00-\uD7AF]/;
const KANA = /[\u3040-\u309F\u30A0-\u30FF]/;
const CJK_UNIFIED = /[\u4E00-\u9FFF]/;

export function isKoreanQuery(query: string): boolean {
  return HANGUL.test(query);
}

// 텍스트에 한글이 있으면 한국어로 간주(한자 혼용 허용).
// 한글이 전혀 없고 CJK 한자 또는 가나가 있으면 중국어/일본어로 판정 → 제외.
export function isAllowedLanguage(text: string): boolean {
  if (!text) return true;
  if (HANGUL.test(text)) return true;
  if (KANA.test(text)) return false;
  if (CJK_UNIFIED.test(text)) return false;
  return true;
}

export function filterByLanguage(candidates: SearchCandidate[]): SearchCandidate[] {
  return candidates.filter((c) => isAllowedLanguage(`${c.title} ${c.author}`));
}
