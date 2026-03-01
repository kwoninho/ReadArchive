import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchResultCard } from "../search-result-card";
import type { SearchCandidate } from "@/types";

const mockCandidate: SearchCandidate = {
  title: "클린 코드",
  author: "로버트 마틴",
  publisher: "인사이트",
  publishedYear: 2013,
  isbn: "9788966260959",
  pageCount: 584,
  summary: "좋은 코드 작성법",
  category: "프로그래밍",
  coverUrl: "https://example.com/cover.jpg",
};

describe("SearchResultCard", () => {
  const defaultProps = {
    candidate: mockCandidate,
    onAdd: vi.fn(),
    isAdding: false,
  };

  it("renders book info (title, author, publisher, year)", () => {
    render(<SearchResultCard {...defaultProps} />);

    expect(screen.getByText("클린 코드")).toBeInTheDocument();
    expect(screen.getByText(/로버트 마틴/)).toBeInTheDocument();
    expect(screen.getByText(/인사이트/)).toBeInTheDocument();
    expect(screen.getByText(/2013년/)).toBeInTheDocument();
  });

  it("calls onAdd with candidate when add button clicked", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <SearchResultCard candidate={mockCandidate} onAdd={onAdd} isAdding={false} />
    );

    await user.click(screen.getByRole("button", { name: "추가" }));

    expect(onAdd).toHaveBeenCalledWith(mockCandidate);
  });

  it("disables button when isAdding is true", () => {
    render(
      <SearchResultCard candidate={mockCandidate} onAdd={vi.fn()} isAdding={true} />
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});
