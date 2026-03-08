import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoteList } from "../note-list";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock format utils
vi.mock("@/lib/format", () => ({
  formatDateTime: (d: string) => `DT:${d}`,
  formatRelativeTime: (d: string) => `REL:${d}`,
}));

describe("NoteList - date display (T-10.02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays formatted date and relative time for each note", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "n1",
          content: "First note",
          created_at: "2026-03-01T10:00:00Z",
          updated_at: "2026-03-01T10:00:00Z",
        },
      ],
    });

    render(<NoteList bookId="book-1" />);

    expect(
      await screen.findByText("DT:2026-03-01T10:00:00Z")
    ).toBeInTheDocument();
    expect(
      screen.getByText("(REL:2026-03-01T10:00:00Z)")
    ).toBeInTheDocument();
  });

  it("displays note content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "n1",
          content: "My reading note",
          created_at: "2026-03-01T10:00:00Z",
          updated_at: "2026-03-01T10:00:00Z",
        },
      ],
    });

    render(<NoteList bookId="book-1" />);

    expect(await screen.findByText("My reading note")).toBeInTheDocument();
  });

  it("shows empty message when no notes", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<NoteList bookId="book-1" />);

    expect(
      await screen.findByText("아직 메모가 없습니다. 첫 메모를 작성해보세요!")
    ).toBeInTheDocument();
  });
});
