import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchBooksWithNaver } from "../naver-book";

describe("searchBooksWithNaver", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("NAVER_CLIENT_ID", "test-id");
    vi.stubEnv("NAVER_CLIENT_SECRET", "test-secret");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  function mockFetchResponse(data: unknown, status = 200) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    });
  }

  it("정상 응답을 SearchCandidate[]로 매핑한다", async () => {
    mockFetchResponse({
      total: 1,
      items: [
        {
          title: "괴테는 모든 것을 말했다",
          author: "장재형",
          publisher: "페이스메이커",
          pubdate: "20230401",
          isbn: "1188087487 9791188087488",
          description: "괴테의 통찰을 현대적으로 풀어낸 책.",
          image: "https://shopping-phinf.pstatic.net/main_0/cover.jpg",
        },
      ],
    });

    const result = await searchBooksWithNaver("괴테");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      title: "괴테는 모든 것을 말했다",
      author: "장재형",
      publisher: "페이스메이커",
      publishedYear: 2023,
      isbn: "9791188087488",
      pageCount: 0,
      summary: "괴테의 통찰을 현대적으로 풀어낸 책.",
      category: "",
      coverUrl: "https://shopping-phinf.pstatic.net/main_0/cover.jpg",
    });
  });

  it("title/author/publisher/description의 <b> 하이라이트 태그를 제거한다", async () => {
    mockFetchResponse({
      items: [
        {
          title: "<b>괴테</b>는 모든 것을 말했다",
          author: "<b>장재형</b>",
          publisher: "<b>페이스메이커</b>",
          pubdate: "20230401",
          isbn: "9791188087488",
          description: "설명 <b>괴테</b>의 통찰",
          image: "https://example.com/cover.jpg",
        },
      ],
    });

    const result = await searchBooksWithNaver("괴테");
    expect(result[0].title).toBe("괴테는 모든 것을 말했다");
    expect(result[0].author).toBe("장재형");
    expect(result[0].publisher).toBe("페이스메이커");
    expect(result[0].summary).toBe("설명 괴테의 통찰");
  });

  it("ISBN13이 있으면 13자리 우선, 없으면 10자리 사용", async () => {
    mockFetchResponse({
      items: [
        { title: "A", isbn: "1234567890 9781234567897", pubdate: "2020" },
        { title: "B", isbn: "1234567890", pubdate: "2020" },
        { title: "C", isbn: "", pubdate: "2020" },
      ],
    });

    const result = await searchBooksWithNaver("q");
    expect(result[0].isbn).toBe("9781234567897");
    expect(result[1].isbn).toBe("1234567890");
    expect(result[2].isbn).toBe("");
  });

  it("pubdate YYYYMMDD에서 연도를 추출한다", async () => {
    mockFetchResponse({
      items: [
        { title: "A", pubdate: "20231215" },
        { title: "B", pubdate: "2020" },
        { title: "C", pubdate: "잘못된값" },
        { title: "D", pubdate: "" },
      ],
    });
    const result = await searchBooksWithNaver("q");
    expect(result[0].publishedYear).toBe(2023);
    expect(result[1].publishedYear).toBe(2020);
    expect(result[2].publishedYear).toBe(0);
    expect(result[3].publishedYear).toBe(0);
  });

  it("author의 캐럿 구분자를 comma join으로 변환한다", async () => {
    mockFetchResponse({
      items: [{ title: "A", author: "장재형^김철수^이영희", pubdate: "2020" }],
    });
    const result = await searchBooksWithNaver("q");
    expect(result[0].author).toBe("장재형, 김철수, 이영희");
  });

  it("title이 빈 문자열인 항목은 제외한다", async () => {
    mockFetchResponse({
      items: [
        { title: "유효", pubdate: "2020" },
        { title: "", pubdate: "2020" },
        { title: "   ", pubdate: "2020" },
        { title: "<b></b>", pubdate: "2020" },
      ],
    });
    const result = await searchBooksWithNaver("q");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("유효");
  });

  it("description이 200자를 넘으면 자른다", async () => {
    const long = "설".repeat(250);
    mockFetchResponse({
      items: [{ title: "A", description: long, pubdate: "2020" }],
    });
    const result = await searchBooksWithNaver("q");
    expect(result[0].summary.length).toBe(200);
  });

  it("image가 없으면 coverUrl은 null", async () => {
    mockFetchResponse({
      items: [{ title: "A", pubdate: "2020" }],
    });
    const result = await searchBooksWithNaver("q");
    expect(result[0].coverUrl).toBeNull();
  });

  it("환경변수 누락 시 fetch 호출 없이 빈 배열", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NAVER_CLIENT_ID", "");
    vi.stubEnv("NAVER_CLIENT_SECRET", "");
    const result = await searchBooksWithNaver("q");
    expect(result).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("HTTP 429/500 응답은 예외 throw 없이 빈 배열", async () => {
    mockFetchResponse({ errorMessage: "rate limit" }, 429);
    const result429 = await searchBooksWithNaver("q");
    expect(result429).toEqual([]);

    mockFetchResponse({}, 500);
    const result500 = await searchBooksWithNaver("q");
    expect(result500).toEqual([]);
  });

  it("fetch 예외(타임아웃/네트워크)도 빈 배열로 흡수", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("timeout")
    );
    const result = await searchBooksWithNaver("q");
    expect(result).toEqual([]);
  });

  it("items가 없거나 배열이 아니면 빈 배열", async () => {
    mockFetchResponse({ total: 0 });
    expect(await searchBooksWithNaver("q")).toEqual([]);

    mockFetchResponse({ items: null });
    expect(await searchBooksWithNaver("q")).toEqual([]);

    mockFetchResponse({ items: [] });
    expect(await searchBooksWithNaver("q")).toEqual([]);
  });

  it("요청 시 Naver 인증 헤더를 포함한다", async () => {
    mockFetchResponse({ items: [] });
    await searchBooksWithNaver("test");
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain("openapi.naver.com/v1/search/book.json");
    expect(call[0]).toContain("query=test");
    expect(call[1].headers["X-Naver-Client-Id"]).toBe("test-id");
    expect(call[1].headers["X-Naver-Client-Secret"]).toBe("test-secret");
  });
});
