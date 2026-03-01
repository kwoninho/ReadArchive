import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchBooksWithGoogleBooks } from "../google-books-search";

describe("searchBooksWithGoogleBooks", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetchResponse(data: unknown, status = 200) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    });
  }

  it("maps Google Books response to SearchCandidate[]", async () => {
    mockFetchResponse({
      totalItems: 1,
      items: [
        {
          volumeInfo: {
            title: "JavaScript: The Good Parts",
            authors: ["Douglas Crockford"],
            publisher: "O'Reilly",
            publishedDate: "2008-05-01",
            industryIdentifiers: [
              { type: "ISBN_13", identifier: "9780596517748" },
              { type: "ISBN_10", identifier: "0596517742" },
            ],
            pageCount: 176,
            description: "A short description of the book.",
            categories: ["Computers"],
            imageLinks: {
              thumbnail: "https://example.com/thumb.jpg",
            },
          },
        },
      ],
    });

    const result = await searchBooksWithGoogleBooks("javascript");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      title: "JavaScript: The Good Parts",
      author: "Douglas Crockford",
      publisher: "O'Reilly",
      publishedYear: 2008,
      isbn: "9780596517748",
      pageCount: 176,
      summary: "A short description of the book.",
      category: "Computers",
      coverUrl: "https://example.com/thumb.jpg",
    });
  });

  it("joins multiple authors with comma", async () => {
    mockFetchResponse({
      totalItems: 1,
      items: [
        {
          volumeInfo: {
            title: "Book",
            authors: ["Author A", "Author B"],
            publishedDate: "2020",
          },
        },
      ],
    });

    const result = await searchBooksWithGoogleBooks("test");
    expect(result[0].author).toBe("Author A, Author B");
  });

  it("falls back to ISBN-10 when ISBN-13 is not available", async () => {
    mockFetchResponse({
      totalItems: 1,
      items: [
        {
          volumeInfo: {
            title: "Book",
            industryIdentifiers: [
              { type: "ISBN_10", identifier: "1234567890" },
            ],
          },
        },
      ],
    });

    const result = await searchBooksWithGoogleBooks("test");
    expect(result[0].isbn).toBe("1234567890");
  });

  it("truncates description to 200 characters", async () => {
    const longDescription = "A".repeat(300);
    mockFetchResponse({
      totalItems: 1,
      items: [
        {
          volumeInfo: {
            title: "Book",
            description: longDescription,
          },
        },
      ],
    });

    const result = await searchBooksWithGoogleBooks("test");
    expect(result[0].summary).toHaveLength(200);
  });

  it("returns empty array when no items", async () => {
    mockFetchResponse({ totalItems: 0 });

    const result = await searchBooksWithGoogleBooks("nonexistent");
    expect(result).toEqual([]);
  });

  it("returns empty array when items is empty", async () => {
    mockFetchResponse({ totalItems: 0, items: [] });

    const result = await searchBooksWithGoogleBooks("nonexistent");
    expect(result).toEqual([]);
  });

  it("throws on HTTP error", async () => {
    mockFetchResponse({}, 500);

    await expect(searchBooksWithGoogleBooks("test")).rejects.toThrow(
      "Google Books API 오류: 500"
    );
  });

  it("handles missing optional fields with defaults", async () => {
    mockFetchResponse({
      totalItems: 1,
      items: [
        {
          volumeInfo: {
            // Only title, no optional fields
          },
        },
      ],
    });

    const result = await searchBooksWithGoogleBooks("test");
    expect(result[0]).toEqual({
      title: "",
      author: "",
      publisher: "",
      publishedYear: 0,
      isbn: "",
      pageCount: 0,
      summary: "",
      category: "",
      coverUrl: null,
    });
  });
});
