import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCoverUrl } from "../llm-search";

describe("buildCoverUrl", () => {
  it("generates Open Library URL for valid ISBN-13", () => {
    expect(buildCoverUrl("9781234567890")).toBe(
      "https://covers.openlibrary.org/b/isbn/9781234567890-M.jpg"
    );
  });

  it("strips hyphens and spaces", () => {
    expect(buildCoverUrl("978-1-234-56789-0")).toBe(
      "https://covers.openlibrary.org/b/isbn/9781234567890-M.jpg"
    );
    expect(buildCoverUrl("978 1234567890")).toBe(
      "https://covers.openlibrary.org/b/isbn/9781234567890-M.jpg"
    );
  });

  it("returns null for empty string", () => {
    expect(buildCoverUrl("")).toBeNull();
  });

  it("returns null for string shorter than 10 chars after cleaning", () => {
    expect(buildCoverUrl("12345")).toBeNull();
  });

  it("generates URL for valid ISBN-10", () => {
    expect(buildCoverUrl("1234567890")).toBe(
      "https://covers.openlibrary.org/b/isbn/1234567890-M.jpg"
    );
  });
});

// --- Mocked tests for searchBooksWithLLM ---

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  },
}));

describe("searchBooksWithLLM", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  // Dynamic import to ensure the mock is applied
  async function getSearchFn() {
    const mod = await import("../llm-search");
    return mod.searchBooksWithLLM;
  }

  it("maps LLM response to SearchCandidate[] with coverUrl", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              candidates: [
                {
                  title: "클린 코드",
                  author: "로버트 마틴",
                  publisher: "인사이트",
                  publishedYear: 2013,
                  isbn: "9788966260959",
                  pageCount: 584,
                  summary: "좋은 코드 작성법",
                  category: "프로그래밍",
                },
              ],
            }),
          },
        },
      ],
    });

    const searchBooksWithLLM = await getSearchFn();
    const result = await searchBooksWithLLM("클린 코드");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      title: "클린 코드",
      author: "로버트 마틴",
      publisher: "인사이트",
      publishedYear: 2013,
      isbn: "9788966260959",
      pageCount: 584,
      summary: "좋은 코드 작성법",
      category: "프로그래밍",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9788966260959-M.jpg",
    });
  });

  it("throws when content is empty", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const searchBooksWithLLM = await getSearchFn();
    await expect(searchBooksWithLLM("test")).rejects.toThrow(
      "LLM 응답이 비어 있습니다"
    );
  });

  it("throws when response format is invalid", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ result: [] }),
          },
        },
      ],
    });

    const searchBooksWithLLM = await getSearchFn();
    await expect(searchBooksWithLLM("test")).rejects.toThrow(
      "LLM 응답 형식이 올바르지 않습니다"
    );
  });
});
