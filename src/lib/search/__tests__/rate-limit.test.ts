import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

describe("checkSearchRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  async function getFn() {
    const mod = await import("../rate-limit");
    return mod.checkSearchRateLimit;
  }

  it("returns true when RPC returns true", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    const check = await getFn();
    await expect(check("user-1", 10, 60)).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("check_search_rate_limit", {
      p_user_id: "user-1",
      p_limit: 10,
      p_window_seconds: 60,
    });
  });

  it("returns false when RPC returns false (limit exceeded)", async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    const check = await getFn();
    await expect(check("user-1")).resolves.toBe(false);
  });

  it("fails open (returns true) when RPC errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRpc.mockResolvedValue({ data: null, error: { message: "network" } });
    const check = await getFn();
    await expect(check("user-1")).resolves.toBe(true);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("uses default limit=10 and window=60 when not provided", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    const check = await getFn();
    await check("user-1");
    expect(mockRpc).toHaveBeenCalledWith("check_search_rate_limit", {
      p_user_id: "user-1",
      p_limit: 10,
      p_window_seconds: 60,
    });
  });
});
