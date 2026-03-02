// Zustand 책 상태 스토어
import { create } from "zustand";
import type { Book, BookStatus } from "@/types";

interface BookStore {
  books: Book[];
  filterQuery: string;

  // Actions
  setBooks: (books: Book[]) => void;
  setFilterQuery: (query: string) => void;
  addBook: (book: Book) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  removeBook: (id: string) => void;
  moveBook: (id: string, newStatus: BookStatus) => void;

  // Derived
  filteredBooks: () => Book[];
  booksByStatus: (status: BookStatus) => Book[];
}

// DB 컬럼명(snake_case) → 클라이언트 필드명(camelCase) 변환
export function mapBookFromDB(row: Record<string, unknown>): Book {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    author: (row.author as string) ?? null,
    publisher: (row.publisher as string) ?? null,
    publishedYear: (row.published_year as number) ?? null,
    isbn: (row.isbn as string) ?? null,
    pageCount: (row.page_count as number) ?? null,
    summary: (row.summary as string) ?? null,
    category: (row.category as string) ?? null,
    coverUrl: (row.cover_url as string) ?? null,
    status: row.status as BookStatus,
    rating: (row.rating as number) ?? null,
    startedAt: (row.started_at as string) ?? null,
    finishedAt: (row.finished_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  filterQuery: "",

  setBooks: (books) => set({ books }),
  setFilterQuery: (filterQuery) => set({ filterQuery }),

  addBook: (book) => set((state) => ({ books: [book, ...state.books] })),

  updateBook: (id, updates) =>
    set((state) => ({
      books: state.books.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBook: (id) =>
    set((state) => ({ books: state.books.filter((b) => b.id !== id) })),

  // 낙관적 업데이트: 즉시 로컬 상태 변경 → API 호출은 컴포넌트에서 처리
  moveBook: (id, newStatus) =>
    set((state) => ({
      books: state.books.map((b) => {
        if (b.id !== id) return b;
        const updates: Partial<Book> = { status: newStatus };
        if (newStatus === "READING" && !b.startedAt) {
          updates.startedAt = new Date().toISOString();
        }
        if (newStatus === "FINISHED" && !b.finishedAt) {
          updates.finishedAt = new Date().toISOString();
        }
        return { ...b, ...updates };
      }),
    })),

  filteredBooks: () => {
    const { books, filterQuery } = get();
    if (!filterQuery.trim()) return books;
    const q = filterQuery.toLowerCase();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author && b.author.toLowerCase().includes(q))
    );
  },

  booksByStatus: (status) => {
    return get()
      .filteredBooks()
      .filter((b) => b.status === status);
  },
}));
