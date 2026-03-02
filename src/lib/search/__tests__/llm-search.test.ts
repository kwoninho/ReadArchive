import { describe, it, expect, vi, beforeEach } from "vitest";

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

  it("maps Gemini response to SearchCandidate[] with coverUrl null", async () => {
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
      coverUrl: null,
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
