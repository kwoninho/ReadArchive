// Google Books API 검색 및 표지 이미지 조회
import type { SearchCandidate } from "@/types";

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  industryIdentifiers?: Array<{ type: string; identifier: string }>;
  pageCount?: number;
  description?: string;
  categories?: string[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  language?: string;
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: Array<{ volumeInfo: GoogleBooksVolumeInfo }>;
}

const GOOGLE_BOOKS_ENDPOINT = "https://www.googleapis.com/books/v1/volumes";
const SEARCH_TIMEOUT_MS = 8000;
const COVER_TIMEOUT_MS = 5000;

function pickThumbnail(imageLinks: GoogleBooksVolumeInfo["imageLinks"]): string | null {
  const url = imageLinks?.thumbnail ?? imageLinks?.smallThumbnail;
  return url ? url.replace("http://", "https://") : null;
}

function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function searchBooksWithGoogleBooks(
  query: string
): Promise<SearchCandidate[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: "10",
  });
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }
  const url = `${GOOGLE_BOOKS_ENDPOINT}?${params}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Google Books API 오류: ${response.status}`);
  }

  const data: GoogleBooksResponse = await response.json();
  if (!data.items || data.items.length === 0) {
    return [];
  }

  // 한국어 도서 우선 정렬 (같은 그룹 내 기존 순서 유지)
  const sorted = [...data.items].sort((a, b) => {
    const aKo = a.volumeInfo.language === "ko" ? 0 : 1;
    const bKo = b.volumeInfo.language === "ko" ? 0 : 1;
    return aKo - bKo;
  });

  return sorted.map((item) => {
    const info = item.volumeInfo;
    const isbn13 = info.industryIdentifiers?.find((id) => id.type === "ISBN_13");
    const isbn10 = info.industryIdentifiers?.find((id) => id.type === "ISBN_10");
    const isbn = isbn13?.identifier ?? isbn10?.identifier ?? "";

    let publishedYear = 0;
    if (info.publishedDate) {
      const year = parseInt(info.publishedDate.substring(0, 4), 10);
      if (!isNaN(year)) publishedYear = year;
    }

    return {
      title: info.title ?? "",
      author: info.authors?.join(", ") ?? "",
      publisher: info.publisher ?? "",
      publishedYear,
      isbn,
      pageCount: info.pageCount ?? 0,
      summary: info.description?.substring(0, 200) ?? "",
      category: info.categories?.[0] ?? "",
      coverUrl: pickThumbnail(info.imageLinks),
    };
  });
}

// 후보별 타겟팅된 쿼리로 Google Books에서 표지를 보강한다.
// 기존 구현은 여러 제목을 한 쿼리로 합쳐 정확도가 낮았다.
export async function fetchCovers(candidates: SearchCandidate[]): Promise<void> {
  const withoutCover = candidates.filter((c) => !c.coverUrl);
  if (withoutCover.length === 0) return;

  // LLM이 최대 10개 반환 → 전부 보강 시도 (Google Books free quota 1000/day 충분)
  const targets = withoutCover.slice(0, 10);

  await Promise.allSettled(
    targets.map(async (candidate) => {
      const url = buildCoverSearchUrl(candidate);
      if (!url) return;

      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(COVER_TIMEOUT_MS) });
        if (!response.ok) return;

        const data: GoogleBooksResponse = await response.json();
        if (!data.items || data.items.length === 0) return;

        const cover = findBestCover(candidate, data.items);
        if (cover && !candidate.coverUrl) {
          candidate.coverUrl = cover;
        }
      } catch {
        // 개별 후보 실패는 삼킨다. 다른 후보에 영향 없어야 함.
      }
    })
  );
}

function buildCoverSearchUrl(c: SearchCandidate): string | null {
  const params = new URLSearchParams({ maxResults: "5" });
  const normIsbn = normalizeIsbn(c.isbn ?? "");
  if (normIsbn) {
    params.set("q", `isbn:${normIsbn}`);
  } else if (c.title) {
    const q = c.author
      ? `intitle:"${c.title}" inauthor:"${c.author}"`
      : `intitle:"${c.title}"`;
    params.set("q", q);
  } else {
    return null;
  }
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }
  return `${GOOGLE_BOOKS_ENDPOINT}?${params}`;
}

function findBestCover(
  c: SearchCandidate,
  items: NonNullable<GoogleBooksResponse["items"]>
): string | null {
  const normIsbn = normalizeIsbn(c.isbn ?? "");
  const normTitle = normalizeTitle(c.title ?? "");

  // 1) ISBN 정확 매칭 (하이픈/공백 차이 무시)
  if (normIsbn) {
    for (const item of items) {
      const thumb = pickThumbnail(item.volumeInfo.imageLinks);
      if (!thumb) continue;
      const ids = item.volumeInfo.industryIdentifiers ?? [];
      if (ids.some((id) => normalizeIsbn(id.identifier) === normIsbn)) {
        return thumb;
      }
    }
  }

  // 2) 제목 정규화 매칭 (대소문자/공백/구두점 차이 무시, 접두 일치 허용)
  if (normTitle) {
    for (const item of items) {
      const thumb = pickThumbnail(item.volumeInfo.imageLinks);
      if (!thumb) continue;
      const itemTitle = normalizeTitle(item.volumeInfo.title ?? "");
      if (!itemTitle) continue;
      if (
        itemTitle === normTitle ||
        itemTitle.startsWith(normTitle) ||
        normTitle.startsWith(itemTitle)
      ) {
        return thumb;
      }
    }
  }

  // 3) ISBN 쿼리였다면 응답 자체가 이미 타겟팅된 결과이므로 첫 번째 썸네일 사용
  if (normIsbn) {
    for (const item of items) {
      const thumb = pickThumbnail(item.volumeInfo.imageLinks);
      if (thumb) return thumb;
    }
  }

  return null;
}
