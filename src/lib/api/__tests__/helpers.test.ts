import { describe, it, expect } from "vitest";
import {
  getStringArray,
  isValidBookStatus,
  isValidRating,
  isValidPositiveInt,
  normalizeOptionalString,
  parseBookMetadataFields,
  safeParseJSON,
} from "../helpers";

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

describe("getStringArray", () => {
  it("returns string array when all items are strings", () => {
    expect(
      getStringArray({ categoryIds: ["a", "b"] }, "categoryIds")
    ).toEqual(["a", "b"]);
  });

  it("returns undefined when the field is not an array", () => {
    expect(getStringArray({ categoryIds: "a" }, "categoryIds")).toBeUndefined();
  });

  it("returns undefined when the array contains non-string values", () => {
    expect(
      getStringArray({ categoryIds: ["a", 1] }, "categoryIds")
    ).toBeUndefined();
  });
});

describe("isValidPositiveInt", () => {
  it("returns true for null", () => {
    expect(isValidPositiveInt(null)).toBe(true);
  });

  it.each([1, 5, 100])("returns true for positive integer %d", (v) => {
    expect(isValidPositiveInt(v)).toBe(true);
  });

  it("returns true for value equal to min", () => {
    expect(isValidPositiveInt(3, 3)).toBe(true);
  });

  it("returns false for value below min", () => {
    expect(isValidPositiveInt(0, 1)).toBe(false);
  });

  it("returns false for 0 with default min=1", () => {
    expect(isValidPositiveInt(0)).toBe(false);
  });

  it("returns true for 0 with min=0", () => {
    expect(isValidPositiveInt(0, 0)).toBe(true);
  });

  it.each([1.5, -1, "3", undefined, {}])(
    "returns false for invalid value %j",
    (v) => {
      expect(isValidPositiveInt(v)).toBe(false);
    }
  );
});

describe("normalizeOptionalString", () => {
  it("trims and returns non-empty strings", () => {
    expect(normalizeOptionalString("  hello  ")).toBe("hello");
  });

  it("returns null for empty string", () => {
    expect(normalizeOptionalString("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeOptionalString("   ")).toBeNull();
  });

  it.each([null, undefined, 42, {}])(
    "returns null for non-string value %j",
    (v) => {
      expect(normalizeOptionalString(v)).toBeNull();
    }
  );
});

describe("parseBookMetadataFields", () => {
  it("returns empty updates when no metadata fields present", () => {
    const result = parseBookMetadataFields({ status: "READING" });
    expect(result).toEqual({ updates: {} });
  });

  it("parses title and trims it", () => {
    const result = parseBookMetadataFields({ title: "  My Book  " });
    expect(result).toEqual({ updates: { title: "My Book" } });
  });

  it("rejects empty title", () => {
    const result = parseBookMetadataFields({ title: "  " });
    expect(result).toEqual({ error: "제목은 필수입니다", status: 400 });
  });

  it("normalizes optional string fields to null when empty", () => {
    const result = parseBookMetadataFields({
      author: "  ",
      publisher: "",
      isbn: "  ",
      summary: "",
      coverUrl: "",
    });
    expect(result).toEqual({
      updates: {
        author: null,
        publisher: null,
        isbn: null,
        summary: null,
        cover_url: null,
      },
    });
  });

  it("trims and keeps non-empty optional strings", () => {
    const result = parseBookMetadataFields({
      author: " Author ",
      publisher: " Pub ",
    });
    expect(result).toEqual({
      updates: { author: "Author", publisher: "Pub" },
    });
  });

  it("parses valid publishedYear", () => {
    const result = parseBookMetadataFields({ publishedYear: 2024 });
    expect(result).toEqual({ updates: { published_year: 2024 } });
  });

  it("allows null publishedYear", () => {
    const result = parseBookMetadataFields({ publishedYear: null });
    expect(result).toEqual({ updates: { published_year: null } });
  });

  it("rejects invalid publishedYear", () => {
    const result = parseBookMetadataFields({ publishedYear: 0 });
    expect(result).toEqual({
      error: "출판년도는 1 이상의 정수여야 합니다",
      status: 400,
    });
  });

  it("parses valid pageCount", () => {
    const result = parseBookMetadataFields({ pageCount: 300 });
    expect(result).toEqual({ updates: { page_count: 300 } });
  });

  it("rejects invalid pageCount", () => {
    const result = parseBookMetadataFields({ pageCount: 0 });
    expect(result).toEqual({
      error: "페이지 수는 1 이상의 정수여야 합니다",
      status: 400,
    });
  });

  it("parses all fields together", () => {
    const result = parseBookMetadataFields({
      title: "Book",
      author: "Author",
      pageCount: 200,
      publishedYear: 2024,
    });
    expect(result).toEqual({
      updates: {
        title: "Book",
        author: "Author",
        page_count: 200,
        published_year: 2024,
      },
    });
  });
});
