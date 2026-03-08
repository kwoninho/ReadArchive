import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Supabase mock chain helpers ---
const mockSingle = vi.fn();
const mockUpdateEq2 = vi.fn(() => ({ error: null }));
const mockUpdateEq1 = vi.fn(() => ({ eq: mockUpdateEq2 }));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq1 }));

const mockSelectEq2 = vi.fn(() => ({ single: mockSingle }));
const mockSelectEq1 = vi.fn(() => ({ eq: mockSelectEq2 }));
const mockSelect = vi.fn(() => ({ eq: mockSelectEq1 }));

const mockDeleteEq2 = vi.fn(() => ({ error: null }));
const mockDeleteEq1 = vi.fn(() => ({ eq: mockDeleteEq2 }));
const mockDeleteFn = vi.fn(() => ({ eq: mockDeleteEq1 }));
const mockInsert = vi.fn(() => ({ error: null }));
const mockIn = vi.fn(() => ({ data: [], error: null }));
const mockCatSelectEq = vi.fn(() => ({ data: [], error: null }));

const mockFrom = vi.fn((table: string) => {
  if (table === "categories") {
    return { select: vi.fn(() => ({ in: mockIn })) };
  }
  if (table === "book_categories") {
    return {
      select: vi.fn(() => ({ eq: mockCatSelectEq })),
      delete: mockDeleteFn,
      insert: mockInsert,
    };
  }
  // books table
  return { select: mockSelect, update: mockUpdate, delete: mockDeleteFn };
});

const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/helpers", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  isAuthError: (r: unknown) => r instanceof Response,
  safeParseJSON: async (req: Request) => {
    try { return await req.json(); } catch { return null; }
  },
  getStringArray: (body: Record<string, unknown>, key: string) => {
    const val = body[key];
    if (!Array.isArray(val)) return undefined;
    return val.every((i: unknown) => typeof i === "string") ? val : undefined;
  },
  isValidBookStatus: (v: unknown) =>
    typeof v === "string" && ["WANT_TO_READ", "READING", "FINISHED"].includes(v),
  isValidRating: (v: unknown) => {
    if (v === null) return true;
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
  },
  parseBookMetadataFields: (body: Record<string, unknown>) => {
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim() === "") {
        return { error: "제목은 필수입니다", status: 400 };
      }
      updates.title = body.title.trim();
    }
    if (body.pageCount !== undefined) {
      if (body.pageCount !== null && (typeof body.pageCount !== "number" || body.pageCount < 1)) {
        return { error: "페이지 수는 1 이상의 정수여야 합니다", status: 400 };
      }
      updates.page_count = body.pageCount;
    }
    return { updates };
  },
}));

vi.mock("@/lib/books", () => ({
  BOOK_WITH_CATEGORIES_SELECT: "id, title",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://test.com/api/books/book-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const routeParams = { params: Promise.resolve({ id: "book-1" }) };

function setupAuth(existingBook = { id: "book-1", current_page: 50, page_count: 200 }) {
  mockRequireAuth.mockResolvedValue({
    supabase: { from: mockFrom },
    user: { id: "user-1" },
  });
  // Initial book lookup
  mockSingle.mockResolvedValue({ data: existingBook, error: null });
}

function setupSuccessfulUpdate() {
  // Final re-fetch after update
  const finalData = { id: "book-1", title: "Test" };
  // We need to handle the second .select() call (final re-fetch)
  // Since mockSelect is reused, we chain: first call = existing book lookup, second = final fetch
  let callCount = 0;
  mockSingle.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return { data: { id: "book-1", current_page: 50, page_count: 200 }, error: null };
    }
    return { data: finalData, error: null };
  });
}

describe("PATCH /api/books/[id] - currentPage validation (T-10.07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  async function callPATCH(body: Record<string, unknown>) {
    const { PATCH } = await import("../route");
    return PATCH(makeRequest(body) as never, routeParams as never);
  }

  it("rejects non-integer currentPage", async () => {
    const res = await callPATCH({ currentPage: 1.5 });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("현재 페이지는 0 이상의 정수여야 합니다");
  });

  it("rejects negative currentPage", async () => {
    const res = await callPATCH({ currentPage: -1 });
    expect(res.status).toBe(400);
  });

  it("rejects string currentPage", async () => {
    const res = await callPATCH({ currentPage: "50" });
    expect(res.status).toBe(400);
  });

  it("rejects currentPage exceeding existing pageCount", async () => {
    const res = await callPATCH({ currentPage: 201 });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("200");
  });

  it("accepts valid currentPage=0", async () => {
    setupSuccessfulUpdate();
    const res = await callPATCH({ currentPage: 0 });
    expect(res.status).not.toBe(400);
  });

  it("accepts null currentPage", async () => {
    setupSuccessfulUpdate();
    const res = await callPATCH({ currentPage: null });
    expect(res.status).not.toBe(400);
  });

  it("uses new pageCount as reference when both sent", async () => {
    setupSuccessfulUpdate();
    // currentPage=250 valid against new pageCount=300, invalid against existing 200
    const res = await callPATCH({ currentPage: 250, pageCount: 300 });
    expect(res.status).not.toBe(400);
  });
});

describe("PATCH /api/books/[id] - auth & not found (T-10.07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function callPATCH(body: Record<string, unknown>) {
    const { PATCH } = await import("../route");
    return PATCH(makeRequest(body) as never, routeParams as never);
  }

  it("returns 401 for unauthenticated requests", async () => {
    mockRequireAuth.mockResolvedValue(
      Response.json({ error: "인증이 필요합니다" }, { status: 401 })
    );
    const res = await callPATCH({ status: "FINISHED" });
    expect(res.status).toBe(401);
  });

  it("returns 404 when book not found", async () => {
    setupAuth();
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const res = await callPATCH({ currentPage: 100 });
    expect(res.status).toBe(404);
  });
});
