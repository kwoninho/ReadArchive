import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileBoard } from "../mobile-board";
import { useBookStore } from "@/stores/book-store";
import type { Book } from "@/types";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    userId: "user-1",
    title: "테스트 책",
    author: "저자",
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

describe("MobileBoard", () => {
  beforeEach(() => {
    useBookStore.setState({ books: [], filterQuery: "", selectedCategory: null });
  });

  it("shows paused tab and mobile actions for reading and paused books", async () => {
    const user = userEvent.setup();
    useBookStore.setState({
      books: [
        makeBook({ id: "reading", status: "READING", title: "읽는 책" }),
        makeBook({ id: "paused", status: "PAUSED", title: "멈춘 책" }),
      ],
    });

    render(<MobileBoard onAddClick={() => undefined} />);

    expect(screen.getByRole("button", { name: "멈춤(1)" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "읽는중(1)" }));
    expect(screen.getByText("읽는 책")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "읽다 멈춤" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "독서 완료 ✓" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "멈춤(1)" }));
    expect(screen.getByText("멈춘 책")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 읽기 ▶" })).toBeInTheDocument();
  });
});
