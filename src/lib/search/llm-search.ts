// Gemini 기반 책 검색 (Naver/Google이 모두 실패했을 때 최후 폴백)
import type { SearchCandidate } from "@/types";
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { filterByLanguage, isKoreanQuery } from "./language";

const SEARCH_PROMPT = `다음 검색어에 해당하는 **실제로 출판된 책**을 JSON으로 반환해주세요.
검색어: "{query}"

응답 형식 (JSON만 반환, 다른 텍스트 없음):
{
  "candidates": [
    {
      "title": "정확한 책 제목",
      "author": "저자명",
      "publisher": "출판사",
      "publishedYear": 2024,
      "isbn": "ISBN-13",
      "pageCount": 300,
      "summary": "2~3문장 요약",
      "category": "카테고리"
    }
  ]
}

**엄격한 규칙**:
- 실제 존재·출판된 책만. 가상의 책·추정 ISBN·환각 금지.
- 확신이 없으면 "candidates": [] 로 빈 배열만 반환.
- 검색어가 한국어(한글 포함)이면 **국내 출간 한국어 도서만** 반환.
- 중국어·일본어 도서는 절대 포함 금지.
- 제목 정확 일치, 저자 직접 저서, 공식 시리즈 작품만. 단순 키워드 매칭·주제 연관서 금지.
- 최대 10개까지.`;

// LLM이 타입을 어긋나게 돌려줄 수 있으므로(숫자를 문자열로, 필드 누락 등)
// 런타임 coerce/정규화를 거친다.
interface RawLLMCandidate {
  title?: unknown;
  author?: unknown;
  publisher?: unknown;
  publishedYear?: unknown;
  isbn?: unknown;
  pageCount?: unknown;
  summary?: unknown;
  category?: unknown;
}

interface LLMSearchResult {
  candidates?: unknown;
}

function toStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function toInt(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function normalizeCandidate(raw: RawLLMCandidate): SearchCandidate | null {
  const title = toStr(raw.title).trim();
  if (!title) return null;
  return {
    title,
    author: toStr(raw.author),
    publisher: toStr(raw.publisher),
    publishedYear: toInt(raw.publishedYear),
    isbn: toStr(raw.isbn),
    pageCount: toInt(raw.pageCount),
    summary: toStr(raw.summary),
    category: toStr(raw.category),
    coverUrl: null,
  };
}

// Gemini 응답 지연 시 Google Books 폴백으로 빠르게 전환하기 위한 상한
const GEMINI_TIMEOUT_MS = 6000;

// 싱글턴 Gemini 모델 (지연 초기화)
let geminiModel: GenerativeModel | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} 타임아웃 (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getGeminiModel(): GenerativeModel {
  if (!geminiModel) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    geminiModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });
  }
  return geminiModel;
}

export async function searchBooksWithLLM(
  query: string
): Promise<SearchCandidate[]> {
  const model = getGeminiModel();
  const prompt = SEARCH_PROMPT.replace("{query}", query);

  console.log("[gemini] sending request, query:", query);
  const result = await withTimeout(
    model.generateContent(prompt),
    GEMINI_TIMEOUT_MS,
    "Gemini"
  );

  const content = result.response.text();
  console.log("[gemini] raw response:", content.substring(0, 500));
  if (!content) {
    throw new Error("LLM 응답이 비어 있습니다");
  }

  const parsed: LLMSearchResult = JSON.parse(content);
  if (!Array.isArray(parsed.candidates)) {
    console.error("[gemini] unexpected format, keys:", Object.keys(parsed));
    throw new Error("LLM 응답 형식이 올바르지 않습니다");
  }

  // title 없는 항목은 제외 (UI 표시 불가)
  const normalized = (parsed.candidates as RawLLMCandidate[])
    .map(normalizeCandidate)
    .filter((c): c is SearchCandidate => c !== null);

  // 언어 필터: 중국어/일본어 제목·저자 제외
  const langFiltered = filterByLanguage(normalized);

  // 한글 쿼리는 한국어 제목 도서만 통과 (LLM이 영문 해외서 섞어 돌리는 경우 방지)
  const final = isKoreanQuery(query)
    ? langFiltered.filter((c) => /[\uAC00-\uD7AF]/.test(c.title))
    : langFiltered;

  console.log(
    `[gemini] parsed ${parsed.candidates.length} → normalized ${normalized.length} → final ${final.length}`
  );
  return final;
}
