// Gemini 기반 책 검색
import type { SearchCandidate } from "@/types";
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

const SEARCH_PROMPT = `다음 검색어와 관련된 책 정보를 JSON 형식으로 제공해주세요.
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

제목이 정확히 일치하지 않아도, 검색어와 관련 있는 책을 포함해주세요.
키워드나 부분 제목으로도 관련 도서를 찾아서 반환해주세요.
후보가 여러 개일 경우 최대 10개까지 반환해주세요.`;

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

// 싱글턴 Gemini 모델 (지연 초기화)
let geminiModel: GenerativeModel | null = null;

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
  const result = await model.generateContent(prompt);

  const content = result.response.text();
  console.log("[gemini] raw response:", content.substring(0, 500));
  if (!content) {
    throw new Error("LLM 응답이 비어 있습니다");
  }

  const parsed: LLMSearchResult = JSON.parse(content);
  if (!parsed.candidates || !Array.isArray(parsed.candidates)) {
    console.error("[gemini] unexpected format, keys:", Object.keys(parsed));
    throw new Error("LLM 응답 형식이 올바르지 않습니다");
  }

  console.log(`[gemini] parsed ${parsed.candidates.length} candidates`);
  return parsed.candidates.map((c) => ({
    title: c.title,
    author: c.author,
    publisher: c.publisher,
    publishedYear: c.publishedYear,
    isbn: c.isbn,
    pageCount: c.pageCount,
    summary: c.summary,
    category: c.category,
    coverUrl: null, // Google Books API에서 보강
  }));
}
