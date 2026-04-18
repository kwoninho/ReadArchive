export const BOOK_STATUSES = ["WANT_TO_READ", "READING", "FINISHED"] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export interface Category {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  userId: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: number | null;
  isbn: string | null;
  pageCount: number | null;
  currentPage: number | null;
  summary: string | null;
  categories: Category[];
  coverUrl: string | null;
  status: BookStatus;
  rating: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  bookId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchCandidate {
  title: string;
  author: string;
  publisher: string;
  publishedYear: number;
  isbn: string;
  pageCount: number;
  summary: string;
  category: string;
  coverUrl: string | null;
}

export interface SearchResponse {
  candidates: SearchCandidate[];
  source: "gemini" | "google_books" | "naver" | "cache" | "none";
  cached: boolean;
}

/** Next.js App Router 동적 라우트 파라미터 */
export type RouteParams = { params: Promise<{ id: string }> };
