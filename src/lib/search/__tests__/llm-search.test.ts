import { describe, it, expect } from "vitest";
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
