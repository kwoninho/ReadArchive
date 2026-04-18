import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeQuery } from "../cache";
import type { SearchCandidate } from "@/types";

describe("normalizeQuery", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeQuery("  hello  ")).toBe("hello");
  });

  it("converts to lowercase", () => {
    expect(normalizeQuery("JavaScript")).toBe("javascript");
  });

  it("handles combined trim + lowercase", () => {
    expect(normalizeQuery("  Clean Code  ")).toBe("clean code");
  });
});

// --- Mocked tests for getCachedSearch / setCachedSearch ---

const mockSingle = vi.fn();
const mockUpsert = vi.fn();

const mockChain = {
  from: vi.fn(() => mockChain),
  select: vi.fn(() => mockChain),
  eq: vi.fn(() => mockChain),
  gt: vi.fn(() => mockChain),
  order: vi.fn(() => mockChain),
  limit: vi.fn(() => mockChain),
  single: mockSingle,
  upsert: mockUpsert,
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockChain,
}));

describe("getCachedSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function getCachedSearchFn() {
    const mod = await import("../cache");
    return mod.getCachedSearch;
  }

  it("returns cached data on cache hit", async () => {
    const cachedResult: SearchCandidate[] = [
      {
        title: "Test",
        author: "Author",
        publisher: "Pub",
        publishedYear: 2024,
        isbn: "1234567890",
        pageCount: 100,
        summary: "Summary",
        category: "Cat",
        coverUrl: null,
      },
    ];

    mockSingle.mockResolvedValue({
      data: { result: cachedResult },
      error: null,
    });

    const getCachedSearch = await getCachedSearchFn();
    const result = await getCachedSearch("test query");

    expect(result).toEqual(cachedResult);
    expect(mockChain.eq).toHaveBeenCalledWith("query", "test query");
  });

  it("returns null on cache miss", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

    const getCachedSearch = await getCachedSearchFn();
    const result = await getCachedSearch("unknown query");

    expect(result).toBeNull();
  });

  it("normalizes the query before lookup", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const getCachedSearch = await getCachedSearchFn();
    await getCachedSearch("  UPPER Case  ");

    expect(mockChain.eq).toHaveBeenCalledWith("query", "upper case");
  });
});

describe("setCachedSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getSetCachedSearchFn() {
    const mod = await import("../cache");
    return mod.setCachedSearch;
  }

  it("upserts with normalized query, 30-day expiry, and onConflict=query", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const setCachedSearch = await getSetCachedSearchFn();
    await setCachedSearch("  Test Query  ", [], "gemini");

    expect(mockUpsert).toHaveBeenCalledWith(
      {
        query: "test query",
        result: [],
        source: "gemini",
        created_at: "2024-06-01T00:00:00.000Z",
        expires_at: "2024-07-01T00:00:00.000Z",
      },
      { onConflict: "query" }
    );
  });

  it("logs upsert errors instead of silently dropping", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUpsert.mockResolvedValue({ error: { message: "duplicate key" } });

    const setCachedSearch = await getSetCachedSearchFn();
    await setCachedSearch("q", [], "gemini");

    expect(errorSpy).toHaveBeenCalledWith("[cache] upsert error:", "duplicate key");
    errorSpy.mockRestore();
  });
});

// Need afterEach import at top level for the setCachedSearch describe block
import { afterEach } from "vitest";
