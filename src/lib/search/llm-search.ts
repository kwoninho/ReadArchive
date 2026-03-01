// LLM 기반 책 검색
import type { SearchCandidate } from "@/types";

const SEARCH_PROMPT = `다음 책에 대한 정보를 JSON 형식으로 제공해주세요.
검색어: "{query}"

응답 형식 (JSON만 반환, 다른 텍스트 없이):
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

후보가 여러 개일 경우 최대 5개까지 반환해주세요.`;

interface LLMSearchResult {
  candidates: Array<{
    title: string;
    author: string;
    publisher: string;
    publishedYear: number;
    isbn: string;
    pageCount: number;
    summary: string;
    category: string;
  }>;
}

// ISBN으로 Open Library 표지 URL 생성
function buildCoverUrl(isbn: string): string | null {
  if (!isbn) return null;
  const cleaned = isbn.replace(/[-\s]/g, "");
  if (cleaned.length < 10) return null;
  return `https://covers.openlibrary.org/b/isbn/${cleaned}-M.jpg`;
}

export async function searchBooksWithLLM(
  query: string
): Promise<SearchCandidate[]> {
  // 동적 import로 빌드 타임 모듈 평가 방지
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: SEARCH_PROMPT.replace("{query}", query),
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM 응답이 비어 있습니다");
  }

  const parsed: LLMSearchResult = JSON.parse(content);
  if (!parsed.candidates || !Array.isArray(parsed.candidates)) {
    throw new Error("LLM 응답 형식이 올바르지 않습니다");
  }

  return parsed.candidates.map((c) => ({
    title: c.title,
    author: c.author,
    publisher: c.publisher,
    publishedYear: c.publishedYear,
    isbn: c.isbn,
    pageCount: c.pageCount,
    summary: c.summary,
    category: c.category,
    coverUrl: buildCoverUrl(c.isbn),
  }));
}
