// 책 검색 API: 캐시 → LLM → Google Books → Naver 순서
import { NextRequest } from "next/server";
import { requireAuth, isAuthError, safeParseJSON, getString } from "@/lib/api/helpers";
import { searchBooksWithLLM } from "@/lib/search/llm-search";
import { searchBooksWithGoogleBooks, fetchCovers } from "@/lib/search/google-books-search";
import { searchBooksWithNaver } from "@/lib/search/naver-book";
import { fillCoversFromOpenLibrary } from "@/lib/search/open-library";
import { getCachedSearch, setCachedSearch } from "@/lib/search/cache";
import { checkSearchRateLimit } from "@/lib/search/rate-limit";
import type { SearchResponse } from "@/types";

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

  // 2. LLM 검색 시도
  try {
    console.log("[search] trying Gemini...");
    const candidates = await searchBooksWithLLM(query);
    console.log(`[search] Gemini returned ${candidates.length} candidates`);
    if (candidates.length > 0) {
      // 표지 이미지 보강 (Google Books에서 조회)
      try {
        await fetchCovers(candidates);
      } catch (e) {
        console.error("[search] cover enrichment error:", e);
      }
      // 여전히 표지가 비어 있으면 ISBN 기반 Open Library Covers로 보강
      fillCoversFromOpenLibrary(candidates);
      // 캐시 저장 (비동기, 실패 시 로깅)
      setCachedSearch(query, candidates, "gemini").catch((e) =>
        console.error("[search] gemini cache save failed:", e)
      );

      const response: SearchResponse = {
        candidates,
        source: "gemini",
        cached: false,
      };
      return Response.json(response);
    }
  } catch (e) {
    console.error("[search] Gemini error:", e);
  }

  // 3. Google Books API 폴백
  try {
    console.log("[search] trying Google Books fallback...");
    const candidates = await searchBooksWithGoogleBooks(query);
    console.log(`[search] Google Books returned ${candidates.length} candidates`);
    if (candidates.length > 0) {
      // 표지 없는 항목은 ISBN 기반 Open Library Covers로 보강
      fillCoversFromOpenLibrary(candidates);
      // 캐시 저장 (비동기, 실패 시 로깅)
      setCachedSearch(query, candidates, "google_books").catch((e) =>
        console.error("[search] google_books cache save failed:", e)
      );

      const response: SearchResponse = {
        candidates,
        source: "google_books",
        cached: false,
      };
      return Response.json(response);
    }
  } catch (e) {
    console.error("[search] Google Books error:", e);
  }

  // 4. 네이버 책 검색 폴백 (한국 도서 롱테일 커버)
  try {
    console.log("[search] trying Naver Book fallback...");
    const candidates = await searchBooksWithNaver(query);
    console.log(`[search] Naver returned ${candidates.length} candidates`);
    if (candidates.length > 0) {
      // 표지 없는 항목은 ISBN 기반 Open Library Covers로 보강
      fillCoversFromOpenLibrary(candidates);
      // 캐시 저장 (비동기, 실패 시 로깅)
      setCachedSearch(query, candidates, "naver").catch((e) =>
        console.error("[search] naver cache save failed:", e)
      );

      const response: SearchResponse = {
        candidates,
        source: "naver",
        cached: false,
      };
      return Response.json(response);
    }
  } catch (e) {
    console.error("[search] Naver error:", e);
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
