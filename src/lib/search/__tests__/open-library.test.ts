import { describe, it, expect } from "vitest";
import type { SearchCandidate } from "@/types";
import { fillCoversFromOpenLibrary } from "../open-library";

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

describe("fillCoversFromOpenLibrary", () => {
  it("구성: ISBN이 있고 coverUrl이 없으면 Open Library URL로 채운다", () => {
    const candidates = [makeCandidate({ isbn: "9780596517748" })];
    fillCoversFromOpenLibrary(candidates);
    expect(candidates[0].coverUrl).toBe(
      "https://covers.openlibrary.org/b/isbn/9780596517748-M.jpg?default=false"
    );
  });

  it("정규화: ISBN에 하이픈/공백이 섞여 있으면 제거 후 URL 생성", () => {
    const candidates = [makeCandidate({ isbn: "978-0-596-51774-8" })];
    fillCoversFromOpenLibrary(candidates);
    expect(candidates[0].coverUrl).toBe(
      "https://covers.openlibrary.org/b/isbn/9780596517748-M.jpg?default=false"
    );
  });

  it("정규화: ISBN-10의 X 체크섬을 유지", () => {
    const candidates = [makeCandidate({ isbn: "0-306-40615-X" })];
    fillCoversFromOpenLibrary(candidates);
    expect(candidates[0].coverUrl).toBe(
      "https://covers.openlibrary.org/b/isbn/030640615X-M.jpg?default=false"
    );
  });

  it("덮어쓰기 방지: coverUrl이 이미 있으면 변경하지 않는다", () => {
    const existing = "https://example.com/existing.jpg";
    const candidates = [makeCandidate({ isbn: "9780596517748", coverUrl: existing })];
    fillCoversFromOpenLibrary(candidates);
    expect(candidates[0].coverUrl).toBe(existing);
  });

  it("스킵: ISBN이 비어 있으면 coverUrl을 변경하지 않는다", () => {
    const candidates = [makeCandidate({ isbn: "" })];
    fillCoversFromOpenLibrary(candidates);
    expect(candidates[0].coverUrl).toBeNull();
  });

  it("스킵: ISBN 문자열이 숫자/X를 포함하지 않으면 변경하지 않는다", () => {
    const candidates = [makeCandidate({ isbn: "---" })];
    fillCoversFromOpenLibrary(candidates);
    expect(candidates[0].coverUrl).toBeNull();
  });

  it("복수 후보를 각각 독립적으로 처리", () => {
    const candidates = [
      makeCandidate({ isbn: "9780596517748" }),
      makeCandidate({ isbn: "", coverUrl: "https://example.com/a.jpg" }),
      makeCandidate({ isbn: "978-0-306-40615-X" }),
    ];
    fillCoversFromOpenLibrary(candidates);
    expect(candidates[0].coverUrl).toContain("9780596517748");
    expect(candidates[1].coverUrl).toBe("https://example.com/a.jpg");
    expect(candidates[2].coverUrl).toContain("978030640615X");
  });
});
