// Google Books API 폴백 검색
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
    };
  }>;
}

export async function searchBooksWithGoogleBooks(
  query: string
): Promise<SearchCandidate[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: "10",
    langRestrict: "ko",
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

  return data.items.map((item) => {
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
      coverUrl: info.imageLinks?.thumbnail ?? null,
    };
  });
}
