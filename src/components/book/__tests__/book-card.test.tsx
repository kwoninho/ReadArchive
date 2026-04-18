import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookCard } from "../book-card";
import type { Book } from "@/types";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    userId: "user-1",
    title: "Test Book",
    author: "Author",
    publisher: null,
    publishedYear: null,
    isbn: null,
    pageCount: null,
    currentPage: null,
    summary: null,
    categories: [],
    coverUrl: null,
    status: "WANT_TO_READ",
    rating: null,
    startedAt: null,
    finishedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("BookCard - category display", () => {
  it("renders category badges when book has categories", () => {
    const book = makeBook({
      categories: [
        { id: "c1", name: "Fiction" },
        { id: "c2", name: "Science" },
      ],
    });
    render(<BookCard book={book} />);

    expect(screen.getByText("Fiction")).toBeInTheDocument();
    expect(screen.getByText("Science")).toBeInTheDocument();
  });

  it("limits visible categories to 2 with +N indicator", () => {
    const book = makeBook({
      categories: [
        { id: "c1", name: "Fiction" },
        { id: "c2", name: "Science" },
        { id: "c3", name: "History" },
      ],
    });
    render(<BookCard book={book} />);

    expect(screen.getByText("Fiction")).toBeInTheDocument();
    expect(screen.getByText("Science")).toBeInTheDocument();
    expect(screen.queryByText("History")).not.toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("does not render category section when no categories", () => {
    const book = makeBook({ categories: [] });
    render(<BookCard book={book} />);

    expect(screen.queryByRole("list", { name: "카테고리" })).not.toBeInTheDocument();
  });
});
