"use client";

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookDetail } from "../book-detail";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeRawBook(overrides: Record<string, unknown> = {}) {
  return {
    id: "book-1",
    user_id: "user-1",
    title: "Test Book",
    author: "Author",
    publisher: null,
    published_year: null,
    isbn: null,
    page_count: null,
    current_page: null,
    summary: null,
    categories: [],
    cover_url: null,
    status: "WANT_TO_READ",
    rating: null,
    started_at: null,
    finished_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("BookDetail - edit mode (T-10.15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows edit and delete buttons in view mode", () => {
    render(<BookDetail book={makeRawBook()} />);

    expect(screen.getByRole("button", { name: /수정/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /삭제/ })).toBeInTheDocument();
  });

  it("switches to edit form when edit button clicked", async () => {
    const user = userEvent.setup();
    // Mock categories fetch for BookEditForm
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<BookDetail book={makeRawBook()} />);

    await user.click(screen.getByRole("button", { name: /수정/ }));

    // Edit form should show save/cancel buttons
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
    // Edit/delete buttons should be hidden
    expect(screen.queryByRole("button", { name: /수정/ })).not.toBeInTheDocument();
  });

  it("returns to view mode when cancel clicked in edit form", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<BookDetail book={makeRawBook()} />);

    await user.click(screen.getByRole("button", { name: /수정/ }));
    await user.click(screen.getByRole("button", { name: "취소" }));

    // Back to view mode
    expect(screen.getByRole("button", { name: /수정/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
  });

  it("shows reading progress only for READING status", () => {
    render(
      <BookDetail
        book={makeRawBook({
          status: "READING",
          page_count: 200,
          current_page: 50,
        })}
      />
    );

    expect(screen.getByText("독서 진행률")).toBeInTheDocument();
    expect(screen.getByText("50 / 200p (25%)")).toBeInTheDocument();
  });

  it("does not show reading progress for non-READING status", () => {
    render(
      <BookDetail
        book={makeRawBook({
          status: "WANT_TO_READ",
          page_count: 200,
          current_page: 0,
        })}
      />
    );

    expect(screen.queryByText("독서 진행률")).not.toBeInTheDocument();
  });

  it("keeps notes section visible during edit mode", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<BookDetail book={makeRawBook()} />);

    // Notes heading should be visible
    expect(screen.getByText("내 메모")).toBeInTheDocument();

    // Switch to edit mode
    await user.click(screen.getByRole("button", { name: /수정/ }));

    // Notes should still be visible
    expect(screen.getByText("내 메모")).toBeInTheDocument();
  });
});
