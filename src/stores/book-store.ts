// Zustand 책 상태 스토어
import { create } from "zustand";
import type { Book, BookStatus } from "@/types";

interface BookStore {
  books: Book[];
  filterQuery: string;
  selectedCategory: string | null;

  // Actions
  setBooks: (books: Book[]) => void;
  setFilterQuery: (query: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  addBook: (book: Book) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  removeBook: (id: string) => void;
  moveBook: (id: string, newStatus: BookStatus) => void;

  // Derived
  allCategories: () => { id: string; name: string }[];
  filteredBooks: () => Book[];
  booksByStatus: (status: BookStatus) => Book[];
}

// DB 컬럼명(snake_case) → 클라이언트 필드명(camelCase) 변환
export function mapBookFromDB(row: Record<string, unknown>): Book {
  const categories = extractCategories(row);

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
    categories,
    coverUrl: (row.cover_url as string) ?? null,
    status: row.status as BookStatus,
    rating: (row.rating as number) ?? null,
    startedAt: (row.started_at as string) ?? null,
    finishedAt: (row.finished_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function extractCategories(row: Record<string, unknown>): Book["categories"] {
  const directCategories = mapCategoryRecords(row.categories);
  if (directCategories.length > 0) return directCategories;

  if (!Array.isArray(row.book_categories)) return [];

  return row.book_categories.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    return mapCategoryRecords((item as { categories?: unknown }).categories);
  });
}

function mapCategoryRecords(value: unknown): Book["categories"] {
  if (!value || typeof value !== "object") return [];

  // Single object (Supabase many-to-one returns a single object)
  if (!Array.isArray(value)) {
    const id = (value as { id?: unknown }).id;
    const name = (value as { name?: unknown }).name;
    if (typeof id === "string" && typeof name === "string") {
      return [{ id, name }];
    }
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = (item as { id?: unknown }).id;
    const name = (item as { name?: unknown }).name;

    if (typeof id !== "string" || typeof name !== "string") {
      return [];
    }

    return [{ id, name }];
  });
}

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  filterQuery: "",
  selectedCategory: null,

  setBooks: (books) => set({ books }),
  setFilterQuery: (filterQuery) => set({ filterQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

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

  allCategories: () => {
    const { books } = get();
    const map = new Map<string, string>();
    for (const book of books) {
      for (const cat of book.categories) {
        if (!map.has(cat.id)) map.set(cat.id, cat.name);
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  },

  filteredBooks: () => {
    const { books, filterQuery, selectedCategory } = get();
    let result = books;

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.author && b.author.toLowerCase().includes(q))
      );
    }

    if (selectedCategory) {
      result = result.filter((b) =>
        b.categories.some((c) => c.id === selectedCategory)
      );
    }

    return result;
  },

  booksByStatus: (status) => {
    return get()
      .filteredBooks()
      .filter((b) => b.status === status);
  },
}));
