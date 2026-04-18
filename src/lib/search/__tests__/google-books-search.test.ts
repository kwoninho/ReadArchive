import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SearchCandidate } from "@/types";
import { searchBooksWithGoogleBooks, fetchCovers } from "../google-books-search";

function makeCandidate(overrides: Partial<SearchCandidate> = {}): SearchCandidate {
  return {
    title: "",
    author: "",
    publisher: "",
    publishedYear: 0,
    isbn: "",
    pageCount: 0,
    summary: "",
    category: "",
    coverUrl: null,
    ...overrides,
  };
}

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

  it("falls back to smallThumbnail when thumbnail is missing", async () => {
    mockFetchResponse({
      totalItems: 1,
      items: [
        {
          volumeInfo: {
            title: "Book",
            imageLinks: { smallThumbnail: "https://example.com/small.jpg" },
          },
        },
      ],
    });

    const result = await searchBooksWithGoogleBooks("test");
    expect(result[0].coverUrl).toBe("https://example.com/small.jpg");
  });

  it("rewrites http:// to https:// on smallThumbnail fallback", async () => {
    mockFetchResponse({
      totalItems: 1,
      items: [
        {
          volumeInfo: {
            title: "Book",
            imageLinks: { smallThumbnail: "http://example.com/small.jpg" },
          },
        },
      ],
    });

    const result = await searchBooksWithGoogleBooks("test");
    expect(result[0].coverUrl).toBe("https://example.com/small.jpg");
  });
});

describe("fetchCovers", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetchSequence(responses: Array<{ data: unknown; status?: number }>) {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    for (const { data, status = 200 } of responses) {
      fetchMock.mockResolvedValueOnce({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(data),
      });
    }
  }

  it("ISBN이 있는 후보는 isbn: 쿼리로 검색하고 응답의 표지로 채운다", async () => {
    mockFetchSequence([
      {
        data: {
          items: [
            {
              volumeInfo: {
                title: "JavaScript: The Good Parts",
                industryIdentifiers: [
                  { type: "ISBN_13", identifier: "9780596517748" },
                ],
                imageLinks: { thumbnail: "https://example.com/isbn-match.jpg" },
              },
            },
          ],
        },
      },
    ]);

    const candidates = [makeCandidate({ title: "JS Good Parts", isbn: "978-0-596-51774-8" })];
    await fetchCovers(candidates);

    expect(candidates[0].coverUrl).toBe("https://example.com/isbn-match.jpg");
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("q=isbn%3A9780596517748");
  });

  it("ISBN 없는 후보는 intitle/inauthor 쿼리로 검색한다", async () => {
    mockFetchSequence([
      {
        data: {
          items: [
            {
              volumeInfo: {
                title: "Clean Code",
                imageLinks: { thumbnail: "https://example.com/clean.jpg" },
              },
            },
          ],
        },
      },
    ]);

    const candidates = [makeCandidate({ title: "Clean Code", author: "Robert Martin" })];
    await fetchCovers(candidates);

    expect(candidates[0].coverUrl).toBe("https://example.com/clean.jpg");
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/intitle/);
    expect(calledUrl).toMatch(/inauthor/);
  });

  it("정규화 매칭: 제목 대소문자/공백/구두점 차이가 있어도 매칭", async () => {
    mockFetchSequence([
      {
        data: {
          items: [
            {
              volumeInfo: {
                title: "CLEAN, CODE!",
                imageLinks: { thumbnail: "https://example.com/c.jpg" },
              },
            },
          ],
        },
      },
    ]);

    const candidates = [makeCandidate({ title: "  clean   code " })];
    await fetchCovers(candidates);

    expect(candidates[0].coverUrl).toBe("https://example.com/c.jpg");
  });

  it("smallThumbnail fallback: thumbnail 없으면 smallThumbnail 사용", async () => {
    mockFetchSequence([
      {
        data: {
          items: [
            {
              volumeInfo: {
                title: "Book",
                imageLinks: { smallThumbnail: "http://example.com/small.jpg" },
              },
            },
          ],
        },
      },
    ]);

    const candidates = [makeCandidate({ title: "Book" })];
    await fetchCovers(candidates);

    expect(candidates[0].coverUrl).toBe("https://example.com/small.jpg");
  });

  it("이미 coverUrl이 있는 후보는 건드리지 않고 쿼리도 보내지 않는다", async () => {
    const candidates = [
      makeCandidate({ title: "A", coverUrl: "https://example.com/a.jpg" }),
    ];
    await fetchCovers(candidates);

    expect(candidates[0].coverUrl).toBe("https://example.com/a.jpg");
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("후보별 실패는 독립적: 일부 실패해도 다른 후보 표지는 채워진다", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("fail")) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              volumeInfo: {
                title: "Success",
                imageLinks: { thumbnail: "https://example.com/ok.jpg" },
              },
            },
          ],
        }),
      };
    });

    const candidates = [
      makeCandidate({ title: "fail book" }),
      makeCandidate({ title: "Success" }),
    ];
    await fetchCovers(candidates);

    expect(candidates[0].coverUrl).toBeNull();
    expect(candidates[1].coverUrl).toBe("https://example.com/ok.jpg");
  });

  it("Google Books API 전체 실패해도 예외를 전파하지 않는다", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValue(new Error("network error"));

    const candidates = [makeCandidate({ title: "A" })];
    await expect(fetchCovers(candidates)).resolves.toBeUndefined();
    expect(candidates[0].coverUrl).toBeNull();
  });

  it("매칭 실패: 응답 아이템의 제목/ISBN이 후보와 무관하면 coverUrl을 채우지 않는다", async () => {
    mockFetchSequence([
      {
        data: {
          items: [
            {
              volumeInfo: {
                title: "Completely Different Book",
                industryIdentifiers: [{ type: "ISBN_13", identifier: "9999999999999" }],
                imageLinks: { thumbnail: "https://example.com/x.jpg" },
              },
            },
          ],
        },
      },
    ]);

    const candidates = [makeCandidate({ title: "Clean Code", author: "Robert Martin" })];
    await fetchCovers(candidates);

    expect(candidates[0].coverUrl).toBeNull();
  });

  it("빈 배열/전부 coverUrl 있음: 네트워크 호출 없이 즉시 반환", async () => {
    await fetchCovers([]);
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
