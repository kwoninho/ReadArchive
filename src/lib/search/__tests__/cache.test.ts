import { describe, it, expect } from "vitest";
import { normalizeQuery } from "../cache";

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
