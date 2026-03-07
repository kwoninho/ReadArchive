import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryFilter } from "../category-filter";
import { useBookStore } from "@/stores/book-store";
import type { Book } from "@/types";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "1",
    userId: "user-1",
    title: "Test",
    author: "Author",
    publisher: null,
    publishedYear: null,
    isbn: null,
    pageCount: null,
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

describe("CategoryFilter", () => {
  beforeEach(() => {
    useBookStore.setState({
      books: [
        makeBook({
          id: "1",
          categories: [{ id: "c1", name: "Fiction" }],
        }),
        makeBook({
          id: "2",
          categories: [
            { id: "c1", name: "Fiction" },
            { id: "c2", name: "Science" },
          ],
        }),
      ],
      filterQuery: "",
      selectedCategory: null,
    });
  });

  it("renders category chips from store", () => {
    render(<CategoryFilter />);

    expect(screen.getByText("전체")).toBeInTheDocument();
    expect(screen.getByText("Fiction")).toBeInTheDocument();
    expect(screen.getByText("Science")).toBeInTheDocument();
  });

  it("renders nothing when no categories exist", () => {
    useBookStore.setState({
      books: [makeBook({ id: "1", categories: [] })],
    });
    const { container } = render(<CategoryFilter />);
    expect(container.firstChild).toBeNull();
  });

  it("selects a category on click", async () => {
    const user = userEvent.setup();
    render(<CategoryFilter />);

    await user.click(screen.getByText("Fiction"));

    expect(useBookStore.getState().selectedCategory).toBe("c1");
  });

  it("clears filter when clicking '전체'", async () => {
    const user = userEvent.setup();
    useBookStore.setState({ selectedCategory: "c1" });
    render(<CategoryFilter />);

    await user.click(screen.getByText("전체"));

    expect(useBookStore.getState().selectedCategory).toBeNull();
  });

  it("highlights selected category", () => {
    useBookStore.setState({ selectedCategory: "c1" });
    render(<CategoryFilter />);

    const fictionButton = screen.getByText("Fiction").closest("button");
    expect(fictionButton).toHaveAttribute("data-active", "true");
  });
});
