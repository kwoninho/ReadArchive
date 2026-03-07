import { describe, expect, it } from "vitest";
import {
  normalizeCategoryText,
  resolveCategoryIds,
  resolveCategoryName,
} from "../categories";

const categories = [
  { id: "cat-programming", name: "프로그래밍" },
  { id: "cat-fiction", name: "소설" },
  { id: "cat-other", name: "기타" },
];

describe("normalizeCategoryText", () => {
  it("normalizes case and separators", () => {
    expect(normalizeCategoryText(" Computers / Programming ")).toBe(
      "computers programming"
    );
  });
});

describe("resolveCategoryName", () => {
  it("keeps exact Korean categories", () => {
    expect(resolveCategoryName("소설")).toBe("소설");
  });

  it("maps external English categories", () => {
    expect(resolveCategoryName("Computers")).toBe("프로그래밍");
  });

  it("falls back to 기타 for unknown values", () => {
    expect(resolveCategoryName("Unknown Area")).toBe("기타");
  });

  it("returns null for empty values", () => {
    expect(resolveCategoryName("")).toBeNull();
  });
});

describe("resolveCategoryIds", () => {
  it("returns matching category id", () => {
    expect(resolveCategoryIds("Computers", categories)).toEqual([
      "cat-programming",
    ]);
  });

  it("returns 기타 id when unknown value is provided", () => {
    expect(resolveCategoryIds("Unknown Area", categories)).toEqual([
      "cat-other",
    ]);
  });

  it("returns empty array when no category text exists", () => {
    expect(resolveCategoryIds("", categories)).toEqual([]);
  });
});
