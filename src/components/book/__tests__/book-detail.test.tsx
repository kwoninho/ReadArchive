import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookDetail } from "../book-detail";

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

describe("BookDetail - category display", () => {
  it("renders category badges when book has categories", () => {
    const book = makeRawBook({
      categories: [
        { id: "c1", name: "Fiction" },
        { id: "c2", name: "Science" },
      ],
    });
    render(<BookDetail book={book} />);

    expect(screen.getByText("Fiction")).toBeInTheDocument();
    expect(screen.getByText("Science")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "카테고리" })).toBeInTheDocument();
  });

  it("does not render category section when no categories", () => {
    const book = makeRawBook({ categories: [] });
    render(<BookDetail book={book} />);

    expect(screen.queryByRole("list", { name: "카테고리" })).not.toBeInTheDocument();
  });
});
