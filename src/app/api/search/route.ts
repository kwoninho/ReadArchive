// 책 검색 API: 캐시 → Naver → Google Books → Gemini(fallback) → 요약 보강
import { NextRequest } from "next/server";
import { requireAuth, isAuthError, safeParseJSON, getString } from "@/lib/api/helpers";
import { searchBooksWithLLM } from "@/lib/search/llm-search";
import { searchBooksWithGoogleBooks, fetchCovers } from "@/lib/search/google-books-search";
import { searchBooksWithNaver } from "@/lib/search/naver-book";
import { fillCoversFromOpenLibrary } from "@/lib/search/open-library";
import { getCachedSearch, setCachedSearch } from "@/lib/search/cache";
import { checkSearchRateLimit } from "@/lib/search/rate-limit";
import { filterByLanguage } from "@/lib/search/language";
import { enrichSummaries } from "@/lib/search/llm-summary";
import type { SearchCandidate, SearchResponse } from "@/types";

type Source = "naver" | "google_books" | "gemini";

async function finalize(
  query: string,
  candidates: SearchCandidate[],
  source: Source
): Promise<SearchResponse> {
  // 표지 보강: Gemini 결과는 Google Books에서 타겟 조회
  if (source === "gemini") {
    try {
      await fetchCovers(candidates);
    } catch (e) {
      console.error("[search] cover enrichment error:", e);
    }
  }
  // 표지 없는 항목은 Open Library로 최종 보강
  fillCoversFromOpenLibrary(candidates);

  // 상위 3개 요약을 LLM으로 병렬 보강 (부실·비한국어 요약 재생성)
  try {
    await enrichSummaries(candidates, query, 3);
  } catch (e) {
    console.error("[search] summary enrichment error:", e);
  }

  // 캐시 저장은 fire-and-forget
  setCachedSearch(query, candidates, source).catch((e) =>
    console.error(`[search] ${source} cache save failed:`, e)
  );

  return { candidates, source, cached: false };
}

export async function POST(request: NextRequest) {
  // 인증 확인
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user } = auth;

  // Rate limit 확인 (DB 기반, 사용자당 분당 10회)
  const allowed = await checkSearchRateLimit(user.id, 10, 60);
  if (!allowed) {
    return Response.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  // 입력 검증
  const body = await safeParseJSON(request);
  if (!body) {
    return Response.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const query = getString(body, "query")?.trim();

  if (!query || query.length === 0) {
    return Response.json(
      { error: "검색어를 입력해주세요" },
      { status: 400 }
    );
  }

  if (query.length > 100) {
    return Response.json(
      { error: "검색어는 100자 이하로 입력해주세요" },
      { status: 400 }
    );
  }

  console.log(`[search] query="${query}"`);

  // 1. 캐시 조회
  try {
    const cached = await getCachedSearch(query);
    if (cached) {
      console.log(`[search] cache hit: ${cached.length} candidates`);
      const response: SearchResponse = {
        candidates: cached,
        source: "cache",
        cached: true,
      };
      return Response.json(response);
    }
    console.log("[search] cache miss");
  } catch (e) {
    console.error("[search] cache error:", e);
  }

  // 2. Naver 우선 (국내 커버리지 최고)
  try {
    console.log("[search] trying Naver...");
    const raw = await searchBooksWithNaver(query);
    const candidates = filterByLanguage(raw);
    console.log(`[search] Naver returned ${raw.length} → ${candidates.length} (lang filtered)`);
    if (candidates.length > 0) {
      return Response.json(await finalize(query, candidates, "naver"));
    }
  } catch (e) {
    console.error("[search] Naver error:", e);
  }

  // 3. Google Books 폴백
  try {
    console.log("[search] trying Google Books...");
    const raw = await searchBooksWithGoogleBooks(query);
    const candidates = filterByLanguage(raw);
    console.log(`[search] Google Books returned ${raw.length} → ${candidates.length} (lang filtered)`);
    if (candidates.length > 0) {
      return Response.json(await finalize(query, candidates, "google_books"));
    }
  } catch (e) {
    console.error("[search] Google Books error:", e);
  }

  // 4. Gemini 최후 폴백 (Naver/Google에 없는 희소 도서)
  try {
    console.log("[search] trying Gemini fallback...");
    const candidates = await searchBooksWithLLM(query);
    console.log(`[search] Gemini returned ${candidates.length} candidates`);
    if (candidates.length > 0) {
      return Response.json(await finalize(query, candidates, "gemini"));
    }
  } catch (e) {
    console.error("[search] Gemini error:", e);
  }

  // 5. 모든 검색 실패
  console.warn("[search] all sources failed for query:", query);
  const response: SearchResponse = {
    candidates: [],
    source: "none",
    cached: false,
  };
  return Response.json(response);
}
