import { describe, it, expect, beforeEach, vi } from "vitest";
import { useBookStore, mapBookFromDB } from "../book-store";
import type { Book } from "@/types";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "1",
    userId: "user-1",
    title: "테스트 책",
    author: "저자",
    publisher: "출판사",
    publishedYear: 2024,
    isbn: "9781234567890",
    pageCount: 300,
    summary: "요약",
    categories: [{ id: "category-1", name: "소설" }],
    coverUrl: null,
    status: "WANT_TO_READ",
    rating: null,
    startedAt: null,
    finishedAt: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("mapBookFromDB", () => {
  it("converts snake_case DB row to camelCase Book", () => {
    const row = {
      id: "1",
      user_id: "user-1",
      title: "책 제목",
      author: "저자",
      publisher: "출판사",
      published_year: 2024,
      isbn: "978-1234567890",
      page_count: 300,
      summary: "요약",
      book_categories: [
        {
          categories: [{ id: "category-1", name: "소설" }],
        },
      ],
      cover_url: "https://example.com/cover.jpg",
      status: "READING",
      rating: 4,
      started_at: "2024-01-01",
      finished_at: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const book = mapBookFromDB(row);

    expect(book).toEqual({
      id: "1",
      userId: "user-1",
      title: "책 제목",
      author: "저자",
      publisher: "출판사",
      publishedYear: 2024,
      isbn: "978-1234567890",
      pageCount: 300,
      summary: "요약",
      categories: [{ id: "category-1", name: "소설" }],
      coverUrl: "https://example.com/cover.jpg",
      status: "READING",
      rating: 4,
      startedAt: "2024-01-01",
      finishedAt: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
  });

  it("preserves null fields", () => {
    const row = {
      id: "1",
      user_id: "u1",
      title: "T",
      author: null,
      publisher: null,
      published_year: null,
      isbn: null,
      page_count: null,
      summary: null,
      book_categories: [],
      cover_url: null,
      status: "WANT_TO_READ",
      rating: null,
      started_at: null,
      finished_at: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const book = mapBookFromDB(row);
    expect(book.author).toBeNull();
    expect(book.publisher).toBeNull();
    expect(book.publishedYear).toBeNull();
    expect(book.isbn).toBeNull();
    expect(book.categories).toEqual([]);
    expect(book.coverUrl).toBeNull();
    expect(book.rating).toBeNull();
  });
});

describe("useBookStore", () => {
  beforeEach(() => {
    useBookStore.setState({ books: [], filterQuery: "", selectedCategory: null });
  });

  describe("setBooks", () => {
    it("replaces the books array", () => {
      const books = [makeBook({ id: "1" }), makeBook({ id: "2" })];
      useBookStore.getState().setBooks(books);
      expect(useBookStore.getState().books).toEqual(books);
    });
  });

  describe("addBook", () => {
    it("prepends a book to the list", () => {
      const existing = makeBook({ id: "1", title: "기존" });
      const newBook = makeBook({ id: "2", title: "신규" });
      useBookStore.setState({ books: [existing] });

      useBookStore.getState().addBook(newBook);

      const books = useBookStore.getState().books;
      expect(books).toHaveLength(2);
      expect(books[0].id).toBe("2");
      expect(books[1].id).toBe("1");
    });
  });

  describe("updateBook", () => {
    it("updates only the targeted book", () => {
      const books = [
        makeBook({ id: "1", title: "A" }),
        makeBook({ id: "2", title: "B" }),
      ];
      useBookStore.setState({ books });

      useBookStore.getState().updateBook("1", { title: "Updated" });

      const result = useBookStore.getState().books;
      expect(result[0].title).toBe("Updated");
      expect(result[1].title).toBe("B");
    });
  });

  describe("removeBook", () => {
    it("removes book by id", () => {
      const books = [makeBook({ id: "1" }), makeBook({ id: "2" })];
      useBookStore.setState({ books });

      useBookStore.getState().removeBook("1");

      const result = useBookStore.getState().books;
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });
  });

  describe("moveBook", () => {
    it("changes status", () => {
      useBookStore.setState({ books: [makeBook({ id: "1", status: "WANT_TO_READ" })] });

      useBookStore.getState().moveBook("1", "READING");

      expect(useBookStore.getState().books[0].status).toBe("READING");
    });

    it("sets startedAt when moving to READING if not already set", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00Z"));

      useBookStore.setState({
        books: [makeBook({ id: "1", status: "WANT_TO_READ", startedAt: null })],
      });

      useBookStore.getState().moveBook("1", "READING");

      expect(useBookStore.getState().books[0].startedAt).toBe(
        "2024-06-15T10:00:00.000Z"
      );
      vi.useRealTimers();
    });

    it("does not overwrite existing startedAt", () => {
      useBookStore.setState({
        books: [
          makeBook({
            id: "1",
            status: "WANT_TO_READ",
            startedAt: "2024-01-01T00:00:00Z",
          }),
        ],
      });

      useBookStore.getState().moveBook("1", "READING");

      expect(useBookStore.getState().books[0].startedAt).toBe(
        "2024-01-01T00:00:00Z"
      );
    });

    it("sets finishedAt when moving to FINISHED if not already set", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00Z"));

      useBookStore.setState({
        books: [makeBook({ id: "1", status: "READING", finishedAt: null })],
      });

      useBookStore.getState().moveBook("1", "FINISHED");

      expect(useBookStore.getState().books[0].finishedAt).toBe(
        "2024-06-15T10:00:00.000Z"
      );
      vi.useRealTimers();
    });

    it("does not overwrite existing finishedAt", () => {
      useBookStore.setState({
        books: [
          makeBook({
            id: "1",
            status: "READING",
            finishedAt: "2024-03-01T00:00:00Z",
          }),
        ],
      });

      useBookStore.getState().moveBook("1", "FINISHED");

      expect(useBookStore.getState().books[0].finishedAt).toBe(
        "2024-03-01T00:00:00Z"
      );
    });
  });

  describe("filteredBooks", () => {
    const books = [
      makeBook({ id: "1", title: "JavaScript 입문", author: "김개발" }),
      makeBook({ id: "2", title: "Python 기초", author: "이파이썬" }),
      makeBook({ id: "3", title: "React 실전", author: "박리액트" }),
    ];

    beforeEach(() => {
      useBookStore.setState({ books, filterQuery: "" });
    });

    it("returns all books when query is empty", () => {
      expect(useBookStore.getState().filteredBooks()).toHaveLength(3);
    });

    it("returns all books when query is only whitespace", () => {
      useBookStore.setState({ filterQuery: "   " });
      expect(useBookStore.getState().filteredBooks()).toHaveLength(3);
    });

    it("filters by title (case insensitive)", () => {
      useBookStore.setState({ filterQuery: "javascript" });
      const result = useBookStore.getState().filteredBooks();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("filters by author (case insensitive)", () => {
      useBookStore.setState({ filterQuery: "김개발" });
      const result = useBookStore.getState().filteredBooks();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });
  });

  describe("allCategories", () => {
    it("returns deduplicated sorted categories from all books", () => {
      useBookStore.setState({
        books: [
          makeBook({
            id: "1",
            categories: [
              { id: "c1", name: "Science" },
              { id: "c2", name: "Fiction" },
            ],
          }),
          makeBook({
            id: "2",
            categories: [
              { id: "c1", name: "Science" },
              { id: "c3", name: "Art" },
            ],
          }),
        ],
      });

      const result = useBookStore.getState().allCategories();
      expect(result).toEqual([
        { id: "c3", name: "Art" },
        { id: "c2", name: "Fiction" },
        { id: "c1", name: "Science" },
      ]);
    });

    it("returns empty array when no categories", () => {
      useBookStore.setState({
        books: [makeBook({ id: "1", categories: [] })],
      });
      expect(useBookStore.getState().allCategories()).toEqual([]);
    });
  });

  describe("selectedCategory filter", () => {
    const books = [
      makeBook({
        id: "1",
        title: "Book A",
        categories: [{ id: "c1", name: "Fiction" }],
      }),
      makeBook({
        id: "2",
        title: "Book B",
        categories: [
          { id: "c1", name: "Fiction" },
          { id: "c2", name: "Science" },
        ],
      }),
      makeBook({
        id: "3",
        title: "Book C",
        categories: [{ id: "c2", name: "Science" }],
      }),
    ];

    beforeEach(() => {
      useBookStore.setState({ books, filterQuery: "", selectedCategory: null });
    });

    it("returns all books when no category selected", () => {
      expect(useBookStore.getState().filteredBooks()).toHaveLength(3);
    });

    it("filters by selected category", () => {
      useBookStore.getState().setSelectedCategory("c1");
      const result = useBookStore.getState().filteredBooks();
      expect(result).toHaveLength(2);
      expect(result.map((b) => b.id)).toEqual(["1", "2"]);
    });

    it("combines with text filter (AND condition)", () => {
      useBookStore.setState({ filterQuery: "Book B", selectedCategory: "c2" });
      const result = useBookStore.getState().filteredBooks();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("clears category filter when set to null", () => {
      useBookStore.getState().setSelectedCategory("c1");
      expect(useBookStore.getState().filteredBooks()).toHaveLength(2);

      useBookStore.getState().setSelectedCategory(null);
      expect(useBookStore.getState().filteredBooks()).toHaveLength(3);
    });
  });

  describe("booksByStatus", () => {
    it("returns books filtered by status", () => {
      useBookStore.setState({
        books: [
          makeBook({ id: "1", status: "WANT_TO_READ" }),
          makeBook({ id: "2", status: "READING" }),
          makeBook({ id: "3", status: "WANT_TO_READ" }),
        ],
        filterQuery: "",
      });

      const wantToRead = useBookStore.getState().booksByStatus("WANT_TO_READ");
      expect(wantToRead).toHaveLength(2);

      const reading = useBookStore.getState().booksByStatus("READING");
      expect(reading).toHaveLength(1);
      expect(reading[0].id).toBe("2");
    });

    it("applies filterQuery together with status", () => {
      useBookStore.setState({
        books: [
          makeBook({ id: "1", status: "READING", title: "JavaScript" }),
          makeBook({ id: "2", status: "READING", title: "Python" }),
        ],
        filterQuery: "python",
      });

      const result = useBookStore.getState().booksByStatus("READING");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });
  });
});
