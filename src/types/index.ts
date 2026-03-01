export type BookStatus = "WANT_TO_READ" | "READING" | "FINISHED";

export interface Book {
  id: string;
  userId: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: number | null;
  isbn: string | null;
  pageCount: number | null;
  summary: string | null;
  category: string | null;
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
  source: "llm" | "google_books" | "cache";
  cached: boolean;
}

export interface BookCreateInput {
  title: string;
  author?: string;
  publisher?: string;
  publishedYear?: number;
  isbn?: string;
  pageCount?: number;
  summary?: string;
  category?: string;
  coverUrl?: string;
  status?: BookStatus;
}

export interface BookUpdateInput {
  status?: BookStatus;
  rating?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}
