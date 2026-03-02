import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCoverUrl } from "../llm-search";

describe("buildCoverUrl", () => {
  it("generates Google Books URL for valid ISBN-13", () => {
    expect(buildCoverUrl("9781234567890")).toBe(
      "https://books.google.com/books/content?vid=isbn:9781234567890&printsec=frontcover&img=1&zoom=1"
    );
  });

  it("strips hyphens and spaces", () => {
    expect(buildCoverUrl("978-1-234-56789-0")).toBe(
      "https://books.google.com/books/content?vid=isbn:9781234567890&printsec=frontcover&img=1&zoom=1"
    );
    expect(buildCoverUrl("978 1234567890")).toBe(
      "https://books.google.com/books/content?vid=isbn:9781234567890&printsec=frontcover&img=1&zoom=1"
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
      "https://books.google.com/books/content?vid=isbn:1234567890&printsec=frontcover&img=1&zoom=1"
    );
  });
});

// --- Mocked tests for searchBooksWithLLM ---

const mockGenerateContent = vi.fn();

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

describe("searchBooksWithLLM", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  async function getSearchFn() {
    const mod = await import("../llm-search");
    return mod.searchBooksWithLLM;
  }

  it("maps Gemini response to SearchCandidate[] with coverUrl", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
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
      coverUrl:
        "https://books.google.com/books/content?vid=isbn:9788966260959&printsec=frontcover&img=1&zoom=1",
    });
  });

  it("throws when content is empty", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "",
      },
    });

    const searchBooksWithLLM = await getSearchFn();
    await expect(searchBooksWithLLM("test")).rejects.toThrow(
      "LLM 응답이 비어 있습니다"
    );
  });

  it("throws when response format is invalid", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ result: [] }),
      },
    });

    const searchBooksWithLLM = await getSearchFn();
    await expect(searchBooksWithLLM("test")).rejects.toThrow(
      "LLM 응답 형식이 올바르지 않습니다"
    );
  });
});
