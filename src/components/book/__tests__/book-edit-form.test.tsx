import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookEditForm } from "../book-edit-form";
import type { Book } from "@/types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    title: "Test Book",
    author: "Author",
    publisher: "Publisher",
    publishedYear: 2024,
    isbn: "1234567890",
    pageCount: 300,
    currentPage: null,
    summary: "A summary",
    coverUrl: "https://example.com/cover.jpg",
    categories: [{ id: "c1", name: "Fiction" }],
    status: "READING",
    rating: 3,
    startedAt: null,
    finishedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("BookEditForm (T-10.13)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock GET /api/categories
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "c1", name: "Fiction" },
        { id: "c2", name: "Science" },
      ],
    });
  });

  it("renders all form fields with initial values", () => {
    const book = makeBook();
    render(
      <BookEditForm book={book} onSave={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.getByDisplayValue("Test Book")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Author")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Publisher")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024")).toBeInTheDocument();
    expect(screen.getByDisplayValue("300")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1234567890")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A summary")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://example.com/cover.jpg")
    ).toBeInTheDocument();
  });

  it("loads and displays categories", async () => {
    render(
      <BookEditForm
        book={makeBook()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(await screen.findByText("Fiction")).toBeInTheDocument();
    expect(screen.getByText("Science")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <BookEditForm book={makeBook()} onSave={vi.fn()} onCancel={onCancel} />
    );

    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onSave with updated fields on submit", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <BookEditForm book={makeBook()} onSave={onSave} onCancel={vi.fn()} />
    );

    // Wait for categories to load
    await screen.findByText("Fiction");

    const titleInput = screen.getByDisplayValue("Test Book");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Title");

    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Title",
          author: "Author",
          categoryIds: ["c1"],
        })
      );
    });
  });

  it("disables save button when title is empty", async () => {
    const user = userEvent.setup();
    render(
      <BookEditForm book={makeBook()} onSave={vi.fn()} onCancel={vi.fn()} />
    );

    const titleInput = screen.getByDisplayValue("Test Book");
    await user.clear(titleInput);

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("toggles category selection", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <BookEditForm
        book={makeBook({ categories: [] })}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );

    // Wait for categories to load
    const fiction = await screen.findByText("Fiction");
    await user.click(fiction);

    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryIds: ["c1"],
        })
      );
    });
  });
});
