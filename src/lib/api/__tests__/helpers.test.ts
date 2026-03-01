import { describe, it, expect } from "vitest";
import { isValidBookStatus, isValidRating, safeParseJSON } from "../helpers";

describe("isValidBookStatus", () => {
  it.each(["WANT_TO_READ", "READING", "FINISHED"])(
    "returns true for valid status '%s'",
    (status) => {
      expect(isValidBookStatus(status)).toBe(true);
    }
  );

  it.each(["INVALID", "reading", "want_to_read", ""])(
    "returns false for invalid string '%s'",
    (status) => {
      expect(isValidBookStatus(status)).toBe(false);
    }
  );

  it.each([42, null, undefined, {}, []])(
    "returns false for non-string value %j",
    (value) => {
      expect(isValidBookStatus(value)).toBe(false);
    }
  );
});

describe("isValidRating", () => {
  it("returns true for null", () => {
    expect(isValidRating(null)).toBe(true);
  });

  it.each([1, 2, 3, 4, 5])(
    "returns true for valid integer %d",
    (rating) => {
      expect(isValidRating(rating)).toBe(true);
    }
  );

  it.each([0, 6, -1, 100])(
    "returns false for out-of-range integer %d",
    (rating) => {
      expect(isValidRating(rating)).toBe(false);
    }
  );

  it.each([1.5, 3.7])("returns false for decimal %d", (rating) => {
    expect(isValidRating(rating)).toBe(false);
  });

  it.each(["3", undefined, {}, []])(
    "returns false for non-number value %j",
    (value) => {
      expect(isValidRating(value)).toBe(false);
    }
  );
});

describe("safeParseJSON", () => {
  it("parses valid JSON body", async () => {
    const request = new Request("http://test.com", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(await safeParseJSON(request)).toEqual({ title: "Test" });
  });

  it("returns null for invalid JSON", async () => {
    const request = new Request("http://test.com", {
      method: "POST",
      body: "not json",
    });
    expect(await safeParseJSON(request)).toBeNull();
  });

  it("returns null for empty body", async () => {
    const request = new Request("http://test.com", { method: "POST" });
    expect(await safeParseJSON(request)).toBeNull();
  });
});
