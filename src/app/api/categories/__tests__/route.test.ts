import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOrder = vi.fn();
const mockSelect = vi.fn(() => ({ order: mockOrder }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

const mockRequireAuth = vi.fn();
const mockIsAuthError = vi.fn((result: unknown) => result instanceof Response);

vi.mock("@/lib/api/helpers", () => ({
  requireAuth: mockRequireAuth,
  isAuthError: mockIsAuthError,
}));

describe("GET /api/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function getRoute() {
    const mod = await import("../route");
    return mod.GET;
  }

  it("returns category list for authenticated users", async () => {
    mockRequireAuth.mockResolvedValue({
      supabase: { from: mockFrom },
      user: { id: "user-1" },
    });
    mockOrder.mockResolvedValue({
      data: [{ id: "cat-1", name: "프로그래밍" }],
      error: null,
    });

    const GET = await getRoute();
    const response = await GET();

    expect(mockFrom).toHaveBeenCalledWith("categories");
    expect(mockSelect).toHaveBeenCalledWith("id, name");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(await response.json()).toEqual([
      { id: "cat-1", name: "프로그래밍" },
    ]);
  });

  it("returns auth error response as-is", async () => {
    const authError = Response.json({ error: "인증이 필요합니다" }, { status: 401 });
    mockRequireAuth.mockResolvedValue(authError);

    const GET = await getRoute();
    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "인증이 필요합니다" });
  });
});
