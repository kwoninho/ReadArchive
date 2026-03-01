// 책 검색 API: 캐시 → LLM → Google Books 순서
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchBooksWithLLM } from "@/lib/search/llm-search";
import { searchBooksWithGoogleBooks } from "@/lib/search/google-books-search";
import { getCachedSearch, setCachedSearch } from "@/lib/search/cache";
import type { SearchResponse } from "@/types";

// 간단한 인메모리 Rate Limiter (사용자당 분당 10회)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // 인증 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  // Rate limit 확인
  if (!checkRateLimit(user.id)) {
    return Response.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  // 입력 검증
  const body = await request.json();
  const query = body.query?.trim();

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

  // 1. 캐시 조회
  try {
    const cached = await getCachedSearch(query);
    if (cached) {
      const response: SearchResponse = {
        candidates: cached,
        source: "cache",
        cached: true,
      };
      return Response.json(response);
    }
  } catch {
    // 캐시 조회 실패는 무시하고 계속 진행
  }

  // 2. LLM 검색 시도
  try {
    const candidates = await searchBooksWithLLM(query);
    if (candidates.length > 0) {
      // 캐시 저장 (비동기, 에러 무시)
      setCachedSearch(query, candidates, "llm").catch(() => {});

      const response: SearchResponse = {
        candidates,
        source: "llm",
        cached: false,
      };
      return Response.json(response);
    }
  } catch {
    // LLM 실패 시 폴백으로 진행
  }

  // 3. Google Books API 폴백
  try {
    const candidates = await searchBooksWithGoogleBooks(query);
    if (candidates.length > 0) {
      // 캐시 저장 (비동기, 에러 무시)
      setCachedSearch(query, candidates, "google_books").catch(() => {});

      const response: SearchResponse = {
        candidates,
        source: "google_books",
        cached: false,
      };
      return Response.json(response);
    }
  } catch {
    // Google Books도 실패
  }

  // 4. 모든 검색 실패
  const response: SearchResponse = {
    candidates: [],
    source: "llm",
    cached: false,
  };
  return Response.json(response);
}
