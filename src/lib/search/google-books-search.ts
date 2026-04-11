// Google Books API 검색 및 표지 이미지 조회
import type { SearchCandidate } from "@/types";

interface GoogleBooksResponse {
  totalItems: number;
  items?: Array<{
    volumeInfo: {
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
    };
  }>;
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
  const url = `https://www.googleapis.com/books/v1/volumes?${params}`;

  const response = await fetch(url);
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
    const isbn13 = info.industryIdentifiers?.find(
      (id) => id.type === "ISBN_13"
    );
    const isbn10 = info.industryIdentifiers?.find(
      (id) => id.type === "ISBN_10"
    );
    const isbn = isbn13?.identifier ?? isbn10?.identifier ?? "";

    // 출판 연도 추출
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
      coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
    };
  });
}

// Google Books API로 표지 URL 조회 (제목+저자 매칭)
export async function fetchCovers(
  candidates: SearchCandidate[]
): Promise<void> {
  const withoutCover = candidates.filter((c) => !c.coverUrl);
  if (withoutCover.length === 0) return;

  // 타이틀 기반으로 한 번만 검색
  const query = withoutCover
    .slice(0, 3)
    .map((c) => c.title)
    .join(" ");
  const params = new URLSearchParams({
    q: query,
    maxResults: "20",
  });
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }
  const url = `https://www.googleapis.com/books/v1/volumes?${params}`;

  const response = await fetch(url);
  if (!response.ok) return;

  const data: GoogleBooksResponse = await response.json();
  if (!data.items) return;

  // ISBN → coverUrl, 제목(소문자) → coverUrl 매핑
  const coverMap = new Map<string, string>();
  for (const item of data.items) {
    const info = item.volumeInfo;
    const thumb = info.imageLinks?.thumbnail?.replace("http://", "https://");
    if (!thumb) continue;

    if (info.title) {
      coverMap.set(info.title.toLowerCase(), thumb);
    }
    for (const id of info.industryIdentifiers ?? []) {
      coverMap.set(id.identifier, thumb);
    }
  }

  // 매칭하여 coverUrl 채우기
  for (const c of candidates) {
    if (c.coverUrl) continue;
    const byIsbn = c.isbn ? coverMap.get(c.isbn) : undefined;
    const byTitle = coverMap.get(c.title.toLowerCase());
    c.coverUrl = byIsbn ?? byTitle ?? c.coverUrl;
  }
}
